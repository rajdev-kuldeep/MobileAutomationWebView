package com.cashi.liveview;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * LOCATOR_USED payload — published by element/wait wrappers whenever the
 * framework touches an element. Server grades quality if not supplied.
 */
public final class LiveViewLocatorEvent extends LiveViewEvent {

    private LiveViewLocatorEvent(String runId, String scenarioId, String stepId) {
        super("LOCATOR_USED", runId);
        put("scenarioId", scenarioId);
        put("stepId", stepId);
    }

    public static LiveViewLocatorEvent of(String runId, String scenarioId, String stepId,
                                          String strategy, String locator) {
        LiveViewLocatorEvent e = new LiveViewLocatorEvent(runId, scenarioId, stepId);
        e.put("strategy", strategy);
        e.put("locator", locator);
        return e;
    }

    public LiveViewLocatorEvent action(String action) { put("action", action); return this; }
    public LiveViewLocatorEvent page(String page) { put("page", page); return this; }
    public LiveViewLocatorEvent method(String method) { put("method", method); return this; }
    public LiveViewLocatorEvent platform(String platform) { put("platform", platform); return this; }
    public LiveViewLocatorEvent quality(String quality) { put("quality", quality); return this; }
    public LiveViewLocatorEvent waitStrategy(String waitStrategy) { put("waitStrategy", waitStrategy); return this; }
    public LiveViewLocatorEvent timeoutMs(Long timeoutMs) { put("timeoutMs", timeoutMs); return this; }
    public LiveViewLocatorEvent pollingMs(Long pollingMs) { put("pollingMs", pollingMs); return this; }
    public LiveViewLocatorEvent durationMs(Long durationMs) { put("durationMs", durationMs); return this; }
    public LiveViewLocatorEvent retryCount(Integer retryCount) { put("retryCount", retryCount); return this; }
    public LiveViewLocatorEvent elementText(String elementText) { put("elementText", elementText); return this; }

    /** FOUND | NOT_FOUND | STALE | TIMEOUT | ERROR */
    public LiveViewLocatorEvent result(String result) { put("result", result); return this; }

    public LiveViewLocatorEvent failure(Throwable error) {
        if (error != null) {
            put("exceptionType", error.getClass().getSimpleName());
            put("message", error.getMessage());
        }
        return this;
    }

    public LiveViewLocatorEvent bounds(int x, int y, int width, int height) {
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("x", x);
        b.put("y", y);
        b.put("width", width);
        b.put("height", height);
        put("bounds", b);
        return this;
    }
}
