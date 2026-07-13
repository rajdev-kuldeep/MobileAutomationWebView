package com.cashi.liveview;

/** RUN_STARTED / RUN_FINISHED payloads. */
public final class LiveViewRunEvent extends LiveViewEvent {

    private LiveViewRunEvent(String eventType, String runId) {
        super(eventType, runId);
    }

    public static LiveViewRunEvent started(String runId, String project, String module,
                                           String environment, String executionMode,
                                           String platform, String testHubUrl) {
        LiveViewRunEvent e = new LiveViewRunEvent("RUN_STARTED", runId);
        e.put("project", project);
        e.put("module", module);
        e.put("environment", environment);
        e.put("executionMode", executionMode);
        e.put("platform", platform);
        e.put("testHubUrl", testHubUrl);
        return e;
    }

    public static LiveViewRunEvent finished(String runId, String status) {
        LiveViewRunEvent e = new LiveViewRunEvent("RUN_FINISHED", runId);
        e.put("status", status); // RUNNING | PASSED | FAILED | ABORTED
        return e;
    }
}
