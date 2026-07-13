package com.cashi.liveview;

/** LOG payload — a single log line for the dashboard console. */
public final class LiveViewLogEvent extends LiveViewEvent {

    private LiveViewLogEvent(String runId) {
        super("LOG", runId);
    }

    /**
     * @param source FRAMEWORK | CUCUMBER | APPIUM | DEVICE | API | LOCATOR |
     *               SCREENSHOT | TESTDATA | RECOVERY | SSO | POPUP | TESTHUB
     * @param level  ERROR | WARN | INFO | DEBUG | TRACE
     */
    public static LiveViewLogEvent of(String runId, String scenarioId, String stepId,
                                      String source, String level, String message) {
        LiveViewLogEvent e = new LiveViewLogEvent(runId);
        e.put("scenarioId", scenarioId);
        e.put("stepId", stepId);
        e.put("source", source);
        e.put("level", level);
        e.put("message", message);
        return e;
    }

    public LiveViewLogEvent logger(String logger) { put("logger", logger); return this; }
    public LiveViewLogEvent thread(String thread) { put("thread", thread); return this; }
}
