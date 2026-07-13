package com.cashi.liveview;

/** PAGE_SOURCE_CAPTURED payload — XML snapshot for the failure panel / inspector. */
public final class LiveViewPageSourceEvent extends LiveViewEvent {

    private LiveViewPageSourceEvent(String runId) {
        super("PAGE_SOURCE_CAPTURED", runId);
    }

    public static LiveViewPageSourceEvent of(String runId, String scenarioId, String stepId,
                                             String pageSourceXml) {
        LiveViewPageSourceEvent e = new LiveViewPageSourceEvent(runId);
        e.put("scenarioId", scenarioId);
        e.put("stepId", stepId);
        e.put("source", pageSourceXml);
        return e;
    }
}
