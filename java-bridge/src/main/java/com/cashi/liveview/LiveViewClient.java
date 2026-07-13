package com.cashi.liveview;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Public facade of the Live View bridge — the ONLY class the framework
 * (Hooks, RunnerBase, ScreenshotManager, LoggerUtils, wrappers) should touch.
 *
 * Every publish method is best-effort and exception-safe: if the dashboard is
 * down, disabled, or misbehaving, calls become no-ops and automation continues.
 *
 * Thread-safety: safe for parallel scenario execution. The current run id is
 * process-wide (one run per JVM); scenario/step ids are per-thread so parallel
 * scenarios do not clobber each other.
 */
public final class LiveViewClient {

    private static final LiveViewClient INSTANCE = new LiveViewClient();

    private final LiveViewConfig config = LiveViewConfig.get();
    private final LiveViewEventPublisher publisher;

    private volatile String runId;
    private final ThreadLocal<String> currentScenarioId = new ThreadLocal<>();
    private final ThreadLocal<String> currentStepId = new ThreadLocal<>();

    private LiveViewClient() {
        this.publisher = config.isEnabled() ? new LiveViewEventPublisher(config) : null;
    }

    public static LiveViewClient getInstance() {
        return INSTANCE;
    }

    public boolean isEnabled() {
        return config.isEnabled();
    }

    // ------------------------------------------------------------------
    // Run lifecycle (RunnerBase)
    // ------------------------------------------------------------------

    /** Generates and remembers a run id like 20260713-121501. */
    public String startRun(String project, String module, String environment,
                           String executionMode, String platform, String testHubUrl) {
        this.runId = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        publish(LiveViewRunEvent.started(runId, project, module, environment,
                executionMode, platform, testHubUrl));
        return runId;
    }

    public void finishRun(String status) {
        publish(LiveViewRunEvent.finished(runId(), status));
    }

    public String runId() {
        return runId != null ? runId : "unknown-run";
    }

    // ------------------------------------------------------------------
    // Scenario / step lifecycle (Hooks)
    // ------------------------------------------------------------------

    public void scenarioStarted(String scenarioId, String featureName,
                                String scenarioName, List<String> tags) {
        currentScenarioId.set(scenarioId);
        publish(LiveViewScenarioEvent.started(runId(), scenarioId, featureName, scenarioName, tags));
    }

    public void scenarioFinished(String scenarioId, String status, Long durationMs) {
        publish(LiveViewScenarioEvent.finished(runId(), scenarioId, status, durationMs));
        currentScenarioId.remove();
        currentStepId.remove();
    }

    public void stepStarted(String stepId, String keyword, String stepText) {
        currentStepId.set(stepId);
        publish(LiveViewStepEvent.started(runId(), scenarioId(), stepId, keyword, stepText));
    }

    public void stepPassed(String stepId, Long durationMs) {
        publish(LiveViewStepEvent.passed(runId(), scenarioId(), stepId, durationMs));
    }

    public void stepFailed(String stepId, Long durationMs, Throwable error) {
        publish(LiveViewStepEvent.failed(runId(), scenarioId(), stepId, durationMs, error));
    }

    public void stepSkipped(String stepId) {
        publish(LiveViewStepEvent.skipped(runId(), scenarioId(), stepId));
    }

    // ------------------------------------------------------------------
    // Locators (ElementActionWrapper / WaitWrapper / CommonUtils)
    // ------------------------------------------------------------------

    /** Build with current scenario/step context pre-filled, then publish via {@link #publishLocator}. */
    public LiveViewLocatorEvent newLocatorEvent(String strategy, String locator) {
        return LiveViewLocatorEvent.of(runId(), scenarioId(), stepId(), strategy, locator);
    }

    public void publishLocator(LiveViewLocatorEvent event) {
        if (config.isPublishLocatorEvents()) {
            publish(event);
        }
    }

    // ------------------------------------------------------------------
    // Screenshots (ScreenshotManager)
    // ------------------------------------------------------------------

    /** Publish a screenshot the framework already saved to disk (preferred). */
    public void screenshotSaved(String kind, String path) {
        if (!config.isPublishScreenshots()) {
            return;
        }
        if (config.isScreenshotInline()) {
            try {
                byte[] bytes = Files.readAllBytes(Path.of(path));
                publish(LiveViewScreenshotEvent.inline(runId(), scenarioId(), stepId(), kind, bytes));
                return;
            } catch (Exception ignored) {
                // fall through to path mode
            }
        }
        publish(LiveViewScreenshotEvent.byPath(runId(), scenarioId(), stepId(), kind, path));
    }

    /** Publish raw PNG bytes (e.g. driver.getScreenshotAs) without touching disk. */
    public void screenshotBytes(String kind, byte[] pngBytes) {
        if (config.isPublishScreenshots()) {
            publish(LiveViewScreenshotEvent.inline(runId(), scenarioId(), stepId(), kind, pngBytes));
        }
    }

    // ------------------------------------------------------------------
    // Logs (LoggerUtils bridge / Log4j2 appender)
    // ------------------------------------------------------------------

    public void log(String source, String level, String message) {
        if (config.isPublishLogs()) {
            publish(LiveViewLogEvent.of(runId(), scenarioId(), stepId(), source, level, message));
        }
    }

    // ------------------------------------------------------------------
    // Device info / failure classification / page source
    // ------------------------------------------------------------------

    public LiveViewDeviceInfo newDeviceInfo(String platform) {
        return LiveViewDeviceInfo.of(runId(), platform);
    }

    public void publishDeviceInfo(LiveViewDeviceInfo info) {
        publish(info);
    }

    public LiveViewFailureEvent newFailureEvent(String classification) {
        return LiveViewFailureEvent.of(runId(), scenarioId(), stepId(), classification);
    }

    public void publishFailure(LiveViewFailureEvent event) {
        publish(event);
    }

    public void pageSourceCaptured(String pageSourceXml) {
        publish(LiveViewPageSourceEvent.of(runId(), scenarioId(), stepId(), pageSourceXml));
    }

    // ------------------------------------------------------------------
    // internals
    // ------------------------------------------------------------------

    private String scenarioId() {
        return currentScenarioId.get();
    }

    private String stepId() {
        return currentStepId.get();
    }

    /** Best-effort core: never throws (unless failOnPublishError is set for local debugging). */
    private void publish(LiveViewEvent event) {
        if (publisher == null) {
            return;
        }
        try {
            publisher.offer(event);
        } catch (RuntimeException e) {
            if (config.isFailOnPublishError()) {
                throw e;
            }
            // swallowed by design: the dashboard must never fail a test
        }
    }
}
