package com.cashi.liveview;

/** DEVICE_INFO payload — capabilities and session details for the header/session panel. */
public final class LiveViewDeviceInfo extends LiveViewEvent {

    private LiveViewDeviceInfo(String runId) {
        super("DEVICE_INFO", runId);
    }

    public static LiveViewDeviceInfo of(String runId, String platform) {
        LiveViewDeviceInfo e = new LiveViewDeviceInfo(runId);
        e.put("platform", platform); // Android | iOS
        return e;
    }

    public LiveViewDeviceInfo deviceName(String name) { put("deviceName", name); return this; }
    public LiveViewDeviceInfo udid(String udid) { put("udid", udid); return this; }
    public LiveViewDeviceInfo osVersion(String version) { put("osVersion", version); return this; }
    public LiveViewDeviceInfo environment(String env) { put("environment", env); return this; }
    public LiveViewDeviceInfo executionMode(String mode) { put("executionMode", mode); return this; }
    public LiveViewDeviceInfo appiumPort(Integer port) { put("appiumPort", port); return this; }
    public LiveViewDeviceInfo systemPort(Integer port) { put("systemPort", port); return this; }
    public LiveViewDeviceInfo chromeDriverPort(Integer port) { put("chromeDriverPort", port); return this; }
    public LiveViewDeviceInfo wdaPort(Integer port) { put("wdaPort", port); return this; }
    public LiveViewDeviceInfo appiumSessionId(String id) { put("appiumSessionId", id); return this; }
    public LiveViewDeviceInfo wdaSessionId(String id) { put("wdaSessionId", id); return this; }
    public LiveViewDeviceInfo xcodeRuntime(String runtime) { put("xcodeRuntime", runtime); return this; }
    public LiveViewDeviceInfo implicitWaitSec(Integer sec) { put("implicitWaitSec", sec); return this; }
    public LiveViewDeviceInfo appPackage(String pkg) { put("appPackage", pkg); return this; }
    public LiveViewDeviceInfo appActivity(String activity) { put("appActivity", activity); return this; }
    public LiveViewDeviceInfo bundleId(String bundleId) { put("bundleId", bundleId); return this; }
}
