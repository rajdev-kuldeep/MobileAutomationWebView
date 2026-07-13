package com.cashi.liveview;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Base class for all Live View events. Subclasses add their fields through
 * {@link #put(String, Object)}; serialization is a flat JSON object matching
 * the contract in automation-live-server/src/models/events.ts.
 */
public abstract class LiveViewEvent {

    private final Map<String, Object> fields = new LinkedHashMap<>();

    protected LiveViewEvent(String eventType, String runId) {
        fields.put("eventType", eventType);
        fields.put("runId", runId);
        fields.put("timestamp", OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
    }

    protected final void put(String key, Object value) {
        if (value != null) {
            fields.put(key, value);
        }
    }

    public final String getEventType() {
        return String.valueOf(fields.get("eventType"));
    }

    public final String toJson() {
        return Json.write(fields);
    }

    @Override
    public String toString() {
        return toJson();
    }
}
