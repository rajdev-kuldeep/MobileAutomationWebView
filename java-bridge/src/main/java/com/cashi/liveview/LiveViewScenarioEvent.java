package com.cashi.liveview;

import java.util.List;

/** SCENARIO_STARTED / SCENARIO_FINISHED payloads. */
public final class LiveViewScenarioEvent extends LiveViewEvent {

    private LiveViewScenarioEvent(String eventType, String runId) {
        super(eventType, runId);
    }

    public static LiveViewScenarioEvent started(String runId, String scenarioId,
                                                String featureName, String scenarioName,
                                                List<String> tags) {
        LiveViewScenarioEvent e = new LiveViewScenarioEvent("SCENARIO_STARTED", runId);
        e.put("scenarioId", scenarioId);
        e.put("featureName", featureName);
        e.put("scenarioName", scenarioName);
        e.put("tags", tags);
        return e;
    }

    public static LiveViewScenarioEvent finished(String runId, String scenarioId,
                                                 String status, Long durationMs) {
        LiveViewScenarioEvent e = new LiveViewScenarioEvent("SCENARIO_FINISHED", runId);
        e.put("scenarioId", scenarioId);
        e.put("status", status); // PASSED | FAILED | SKIPPED
        e.put("durationMs", durationMs);
        return e;
    }
}
