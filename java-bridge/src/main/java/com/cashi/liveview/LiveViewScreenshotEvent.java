package com.cashi.liveview;

import java.util.Base64;

/**
 * SCREENSHOT_CAPTURED payload.
 *
 * Two modes:
 *  - byPath: reference the file ScreenshotManager already saved (preferred —
 *    zero extra I/O; the server serves the file from disk).
 *  - inline: embed the PNG bytes base64 (for remote/BrowserStack runs where
 *    the server cannot see the framework's filesystem).
 */
public final class LiveViewScreenshotEvent extends LiveViewEvent {

    private LiveViewScreenshotEvent(String runId, String scenarioId, String stepId, String kind) {
        super("SCREENSHOT_CAPTURED", runId);
        put("scenarioId", scenarioId);
        put("stepId", stepId);
        put("kind", kind); // BEFORE_STEP | AFTER_STEP | FAILURE | MANUAL
    }

    public static LiveViewScreenshotEvent byPath(String runId, String scenarioId, String stepId,
                                                 String kind, String path) {
        LiveViewScreenshotEvent e = new LiveViewScreenshotEvent(runId, scenarioId, stepId, kind);
        e.put("path", path);
        return e;
    }

    public static LiveViewScreenshotEvent inline(String runId, String scenarioId, String stepId,
                                                 String kind, byte[] pngBytes) {
        LiveViewScreenshotEvent e = new LiveViewScreenshotEvent(runId, scenarioId, stepId, kind);
        e.put("imageBase64", Base64.getEncoder().encodeToString(pngBytes));
        return e;
    }
}
