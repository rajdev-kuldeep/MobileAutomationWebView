package com.cashi.liveview;

/**
 * Configuration for the Live View bridge, resolved once at startup.
 *
 * Sources (highest precedence first):
 *   1. JVM system properties     (-DliveView.enabled=true)
 *   2. Environment variables     (LIVEVIEW_ENABLED=true)
 *   3. Defaults below
 *
 * Supported keys:
 *   liveView.enabled                (default false — opt-in)
 *   liveView.serverUrl              (default http://localhost:4545)
 *   liveView.publishScreenshots     (default true)
 *   liveView.publishLocatorEvents   (default true)
 *   liveView.publishLogs            (default true)
 *   liveView.failOnPublishError     (default false — NEVER enable in CI)
 *   liveView.screenshotInline       (default false — POST bytes instead of path)
 *   liveView.queueCapacity          (default 2000)
 *   liveView.connectTimeoutMs       (default 1000)
 *   liveView.requestTimeoutMs       (default 2000)
 */
public final class LiveViewConfig {

    private final boolean enabled;
    private final String serverUrl;
    private final boolean publishScreenshots;
    private final boolean publishLocatorEvents;
    private final boolean publishLogs;
    private final boolean failOnPublishError;
    private final boolean screenshotInline;
    private final int queueCapacity;
    private final int connectTimeoutMs;
    private final int requestTimeoutMs;

    private LiveViewConfig() {
        this.enabled = bool("liveView.enabled", "LIVEVIEW_ENABLED", false);
        this.serverUrl = str("liveView.serverUrl", "LIVEVIEW_SERVER_URL", "http://localhost:4545");
        this.publishScreenshots = bool("liveView.publishScreenshots", "LIVEVIEW_PUBLISH_SCREENSHOTS", true);
        this.publishLocatorEvents = bool("liveView.publishLocatorEvents", "LIVEVIEW_PUBLISH_LOCATOR_EVENTS", true);
        this.publishLogs = bool("liveView.publishLogs", "LIVEVIEW_PUBLISH_LOGS", true);
        this.failOnPublishError = bool("liveView.failOnPublishError", "LIVEVIEW_FAIL_ON_PUBLISH_ERROR", false);
        this.screenshotInline = bool("liveView.screenshotInline", "LIVEVIEW_SCREENSHOT_INLINE", false);
        this.queueCapacity = intVal("liveView.queueCapacity", "LIVEVIEW_QUEUE_CAPACITY", 2000);
        this.connectTimeoutMs = intVal("liveView.connectTimeoutMs", "LIVEVIEW_CONNECT_TIMEOUT_MS", 1000);
        this.requestTimeoutMs = intVal("liveView.requestTimeoutMs", "LIVEVIEW_REQUEST_TIMEOUT_MS", 2000);
    }

    private static final LiveViewConfig INSTANCE = new LiveViewConfig();

    public static LiveViewConfig get() {
        return INSTANCE;
    }

    private static String str(String prop, String env, String def) {
        String v = System.getProperty(prop);
        if (v == null || v.isBlank()) v = System.getenv(env);
        return (v == null || v.isBlank()) ? def : v.trim();
    }

    private static boolean bool(String prop, String env, boolean def) {
        String v = str(prop, env, String.valueOf(def));
        return "true".equalsIgnoreCase(v) || "1".equals(v);
    }

    private static int intVal(String prop, String env, int def) {
        try {
            return Integer.parseInt(str(prop, env, String.valueOf(def)));
        } catch (NumberFormatException e) {
            return def;
        }
    }

    public boolean isEnabled() { return enabled; }
    public String getServerUrl() { return serverUrl; }
    public String getEventsEndpoint() { return serverUrl + "/api/events"; }
    public boolean isPublishScreenshots() { return publishScreenshots; }
    public boolean isPublishLocatorEvents() { return publishLocatorEvents; }
    public boolean isPublishLogs() { return publishLogs; }
    public boolean isFailOnPublishError() { return failOnPublishError; }
    public boolean isScreenshotInline() { return screenshotInline; }
    public int getQueueCapacity() { return queueCapacity; }
    public int getConnectTimeoutMs() { return connectTimeoutMs; }
    public int getRequestTimeoutMs() { return requestTimeoutMs; }
}
