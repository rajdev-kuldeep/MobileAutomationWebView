package com.cashi.liveview;

/** STEP_STARTED / STEP_PASSED / STEP_FAILED / STEP_SKIPPED payloads. */
public final class LiveViewStepEvent extends LiveViewEvent {

    private LiveViewStepEvent(String eventType, String runId, String scenarioId, String stepId) {
        super(eventType, runId);
        put("scenarioId", scenarioId);
        put("stepId", stepId);
    }

    public static LiveViewStepEvent started(String runId, String scenarioId, String stepId,
                                            String keyword, String stepText) {
        LiveViewStepEvent e = new LiveViewStepEvent("STEP_STARTED", runId, scenarioId, stepId);
        e.put("keyword", keyword);
        e.put("stepText", stepText);
        e.put("status", "RUNNING");
        return e;
    }

    public static LiveViewStepEvent passed(String runId, String scenarioId, String stepId, Long durationMs) {
        LiveViewStepEvent e = new LiveViewStepEvent("STEP_PASSED", runId, scenarioId, stepId);
        e.put("status", "PASSED");
        e.put("durationMs", durationMs);
        return e;
    }

    public static LiveViewStepEvent skipped(String runId, String scenarioId, String stepId) {
        LiveViewStepEvent e = new LiveViewStepEvent("STEP_SKIPPED", runId, scenarioId, stepId);
        e.put("status", "SKIPPED");
        return e;
    }

    public static LiveViewStepEvent failed(String runId, String scenarioId, String stepId,
                                           Long durationMs, Throwable error) {
        LiveViewStepEvent e = new LiveViewStepEvent("STEP_FAILED", runId, scenarioId, stepId);
        e.put("status", "FAILED");
        e.put("durationMs", durationMs);
        if (error != null) {
            e.put("exceptionType", error.getClass().getSimpleName());
            e.put("message", error.getMessage());
            e.put("stackTrace", abbreviatedStackTrace(error, 30));
        }
        return e;
    }

    /** Optional context enrichment — page/flow/method the step maps to. */
    public LiveViewStepEvent withContext(String flow, String page, String method) {
        put("flow", flow);
        put("page", page);
        put("method", method);
        return this;
    }

    private static String abbreviatedStackTrace(Throwable error, int maxFrames) {
        StringBuilder sb = new StringBuilder(error.toString());
        StackTraceElement[] frames = error.getStackTrace();
        for (int i = 0; i < Math.min(frames.length, maxFrames); i++) {
            sb.append("\n\tat ").append(frames[i]);
        }
        if (frames.length > maxFrames) {
            sb.append("\n\t... ").append(frames.length - maxFrames).append(" more");
        }
        return sb.toString();
    }
}
