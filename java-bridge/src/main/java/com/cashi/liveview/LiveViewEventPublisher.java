package com.cashi.liveview;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Asynchronous, best-effort HTTP publisher.
 *
 * Guarantees that make it safe inside a test framework:
 *  - offer() never blocks: when the queue is full, the event is dropped and a
 *    counter incremented — test threads never wait on the dashboard.
 *  - one daemon worker thread drains the queue and batches events per POST.
 *  - circuit breaker: after consecutive failures the publisher goes quiet for
 *    a cool-down window instead of hammering a dead server.
 *  - shutdown() flushes what it can within a short deadline, then gives up.
 *
 * Parallel execution: this class is a process-wide singleton used by all
 * scenario threads; the queue is thread-safe and events carry their own
 * runId/scenarioId/stepId, so no per-scenario static state lives here.
 */
final class LiveViewEventPublisher {

    private static final int BATCH_SIZE = 25;
    private static final int FAILURE_THRESHOLD = 3;
    private static final long COOLDOWN_MS = 10_000;

    private final LiveViewConfig config;
    private final HttpClient httpClient;
    private final BlockingQueue<LiveViewEvent> queue;
    private final Thread worker;
    private final AtomicBoolean running = new AtomicBoolean(true);

    private volatile int consecutiveFailures = 0;
    private volatile long circuitOpenUntil = 0;
    private volatile long droppedEvents = 0;
    private volatile boolean unreachableLogged = false;

    LiveViewEventPublisher(LiveViewConfig config) {
        this.config = config;
        this.queue = new LinkedBlockingQueue<>(config.getQueueCapacity());
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(config.getConnectTimeoutMs()))
                .build();
        this.worker = new Thread(this::drainLoop, "liveview-publisher");
        this.worker.setDaemon(true);
        this.worker.start();
        Runtime.getRuntime().addShutdownHook(new Thread(this::shutdown, "liveview-shutdown"));
    }

    /** Non-blocking enqueue. Returns false when the event was dropped. */
    boolean offer(LiveViewEvent event) {
        if (!running.get()) {
            return false;
        }
        boolean accepted = queue.offer(event);
        if (!accepted) {
            droppedEvents++;
        }
        return accepted;
    }

    long getDroppedEvents() {
        return droppedEvents;
    }

    void shutdown() {
        if (!running.compareAndSet(true, false)) {
            return;
        }
        try {
            // Give the worker a moment to flush the tail of the queue.
            worker.join(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void drainLoop() {
        List<LiveViewEvent> batch = new ArrayList<>(BATCH_SIZE);
        while (running.get() || !queue.isEmpty()) {
            try {
                batch.clear();
                LiveViewEvent first = queue.poll(250, TimeUnit.MILLISECONDS);
                if (first == null) {
                    continue;
                }
                batch.add(first);
                queue.drainTo(batch, BATCH_SIZE - 1);

                if (System.currentTimeMillis() < circuitOpenUntil) {
                    droppedEvents += batch.size(); // circuit open: shed load silently
                    continue;
                }
                post(batch);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                onFailure(e);
            }
        }
    }

    private void post(List<LiveViewEvent> batch) {
        StringBuilder body = new StringBuilder("[");
        for (int i = 0; i < batch.size(); i++) {
            if (i > 0) body.append(',');
            body.append(batch.get(i).toJson());
        }
        body.append(']');

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(config.getEventsEndpoint()))
                .timeout(Duration.ofMillis(config.getRequestTimeoutMs()))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();
        try {
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() >= 500) {
                onFailure(new IllegalStateException("live-view server returned " + response.statusCode()));
            } else {
                consecutiveFailures = 0;
                unreachableLogged = false;
            }
        } catch (Exception e) {
            onFailure(e);
        }
    }

    private void onFailure(Exception e) {
        consecutiveFailures++;
        if (consecutiveFailures >= FAILURE_THRESHOLD) {
            circuitOpenUntil = System.currentTimeMillis() + COOLDOWN_MS;
            consecutiveFailures = 0;
            if (!unreachableLogged) {
                // Deliberately plain stderr: the bridge must not depend on Log4j2.
                System.err.println("[LiveView] dashboard unreachable (" + e.getClass().getSimpleName()
                        + "); pausing event publishing for " + (COOLDOWN_MS / 1000)
                        + "s. Test execution continues normally.");
                unreachableLogged = true;
            }
        }
        if (config.isFailOnPublishError()) {
            throw new IllegalStateException("LiveView publish failed and liveView.failOnPublishError=true", e);
        }
    }
}
