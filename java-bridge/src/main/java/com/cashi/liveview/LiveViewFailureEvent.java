package com.cashi.liveview;

/**
 * FAILURE_CLASSIFIED payload — structured, AI-ready failure analysis.
 * Publish from Hooks after the framework's own classification runs; the
 * server derives a heuristic classification only when this event is absent.
 */
public final class LiveViewFailureEvent extends LiveViewEvent {

    private LiveViewFailureEvent(String runId, String scenarioId, String stepId) {
        super("FAILURE_CLASSIFIED", runId);
        put("scenarioId", scenarioId);
        put("stepId", stepId);
    }

    /**
     * @param classification APP_ISSUE | AUTOMATION_ISSUE | TEST_DATA_ISSUE |
     *                       ENVIRONMENT_ISSUE | API_DEPENDENCY_ISSUE |
     *                       DEVICE_SESSION_ISSUE | FRAMEWORK_ISSUE |
     *                       UNKNOWN_REQUIRES_INVESTIGATION
     */
    public static LiveViewFailureEvent of(String runId, String scenarioId, String stepId,
                                          String classification) {
        LiveViewFailureEvent e = new LiveViewFailureEvent(runId, scenarioId, stepId);
        e.put("failureClassification", classification);
        return e;
    }

    public LiveViewFailureEvent exception(Throwable error) {
        if (error != null) {
            put("exceptionType", error.getClass().getSimpleName());
            put("message", error.getMessage());
        }
        return this;
    }

    public LiveViewFailureEvent possibleCause(String cause) { put("possibleCause", cause); return this; }
    public LiveViewFailureEvent recommendedFixLayer(String layer) { put("recommendedFixLayer", layer); return this; }
    public LiveViewFailureEvent doNotFixBy(String antiPattern) { put("doNotFixBy", antiPattern); return this; }
    public LiveViewFailureEvent failedPage(String page) { put("failedPage", page); return this; }
    public LiveViewFailureEvent failedLocator(String locator) { put("failedLocator", locator); return this; }
    public LiveViewFailureEvent appActivity(String activity) { put("appActivity", activity); return this; }
    public LiveViewFailureEvent deviceState(String state) { put("deviceState", state); return this; }
}
