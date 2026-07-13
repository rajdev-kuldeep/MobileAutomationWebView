# Java Framework Integration Guide

How to wire **CashiMobileAutomation** to Cashi Automation Live View.

## 0. Install the bridge

Copy `java-bridge/src/main/java/com/cashi/liveview/` into the framework at:

```text
src/test/java/com/cashi/liveview/
```

The package has **zero external dependencies** (JDK `java.net.http` only), so it compiles as-is.
Optionally also copy `java-bridge/optional/LiveViewLog4j2Appender.java` (needs `log4j-core`,
which the framework already has).

## 1. Configuration

Everything is off by default. Enable per run:

```bash
mvn test -DsuiteXmlFile=local_android_debug.xml -DliveView.enabled=true
```

Supported properties (system property or env var):

```properties
liveView.enabled=true
liveView.serverUrl=http://localhost:4545
liveView.publishScreenshots=true
liveView.publishLocatorEvents=true
liveView.publishLogs=true
liveView.failOnPublishError=false      # never true in CI
liveView.screenshotInline=false        # true for BrowserStack/SauceLabs (POST bytes, not paths)
```

## 2. RunnerBase — run lifecycle

```java
public class RunnerBase {

    private static final LiveViewClient liveView = LiveViewClient.getInstance();

    @BeforeSuite(alwaysRun = true)
    public void publishRunStarted() {
        try {
            liveView.startRun(
                    "CashiUIAutomation",
                    "CashiMobileAutomation",
                    ConfigManager.getEnvironment(),      // stage / preprod / prod / local
                    ConfigManager.getExecutionMode(),    // local / browserstack / saucelabs / looper
                    ConfigManager.getPlatform(),         // Android / iOS
                    TestHubReporter.getRunUrlOrNull());
        } catch (Exception e) {
            LoggerUtils.warn("LiveView run-start publish failed, continuing", e);
        }
    }

    @AfterSuite(alwaysRun = true)
    public void publishRunFinished() {
        try {
            liveView.finishRun(suiteHasFailures() ? "FAILED" : "PASSED");
        } catch (Exception e) {
            LoggerUtils.warn("LiveView run-finish publish failed, continuing", e);
        }
    }
}
```

## 3. Hooks — scenario & step lifecycle

Keep the existing screenshot-per-step and TestHub logic exactly as-is; only add publishes.

```java
public class Hooks {

    private static final LiveViewClient liveView = LiveViewClient.getInstance();
    private final ThreadLocal<Integer> stepIndex = ThreadLocal.withInitial(() -> 0);
    private final ThreadLocal<Long> stepStartMs = new ThreadLocal<>();

    @Before(order = 0)
    public void liveViewScenarioStarted(Scenario scenario) {
        try {
            stepIndex.set(0);
            liveView.scenarioStarted(
                    scenario.getId(),
                    featureNameOf(scenario),
                    scenario.getName(),
                    new ArrayList<>(scenario.getSourceTagNames()));

            // Device info once the driver session exists (or from your DriverManager hook):
            liveView.publishDeviceInfo(liveView.newDeviceInfo(ConfigManager.getPlatform())
                    .deviceName(DriverManager.getDeviceName())
                    .udid(DriverManager.getUdid())
                    .osVersion(DriverManager.getOsVersion())
                    .appiumPort(DriverManager.getAppiumPort())
                    .systemPort(DriverManager.getSystemPort())
                    .appiumSessionId(DriverManager.getSessionId())
                    .appPackage(ConfigManager.getAppPackage())
                    .appActivity(ConfigManager.getAppActivity()));
        } catch (Exception e) {
            LoggerUtils.warn("LiveView scenario-start publish failed, continuing", e);
        }
    }

    @BeforeStep
    public void liveViewStepStarted(Scenario scenario) {
        try {
            int index = stepIndex.get() + 1;
            stepIndex.set(index);
            stepStartMs.set(System.currentTimeMillis());
            String stepId = String.format("step-%03d", index);
            // Cucumber-Java doesn't expose step text in hooks; pass what's available.
            // If you already track step text via a TestStepListener/EventListener, pass it here.
            liveView.stepStarted(stepId, null, currentStepTextOrNull());
        } catch (Exception e) {
            LoggerUtils.warn("LiveView step-start publish failed, continuing", e);
        }
    }

    @AfterStep
    public void liveViewStepFinished(Scenario scenario) {
        try {
            String stepId = String.format("step-%03d", stepIndex.get());
            long duration = System.currentTimeMillis() - stepStartMs.get();
            if (scenario.isFailed()) {
                liveView.stepFailed(stepId, duration, ScenarioContext.getLastError());
            } else {
                liveView.stepPassed(stepId, duration);
            }
            // Existing screenshot-per-step hook stays; ScreenshotManager publishes the file (see §4).
        } catch (Exception e) {
            LoggerUtils.warn("LiveView step-finish publish failed, continuing", e);
        }
    }

    @After(order = 100)
    public void liveViewScenarioFinished(Scenario scenario) {
        try {
            if (scenario.isFailed()) {
                // Publish your framework's failure classification — richer than server heuristics.
                liveView.publishFailure(liveView
                        .newFailureEvent(FailureClassifier.classify(scenario).name())
                        .exception(ScenarioContext.getLastError())
                        .failedPage(ScenarioContext.getCurrentPage())
                        .possibleCause(FailureClassifier.possibleCause(scenario))
                        .recommendedFixLayer(FailureClassifier.recommendedLayer(scenario))
                        .doNotFixBy("Adding Thread.sleep in step definition."));
                liveView.pageSourceCaptured(DriverManager.getDriver().getPageSource());
            }
            liveView.scenarioFinished(scenario.getId(),
                    scenario.isFailed() ? "FAILED" : "PASSED", null);
        } catch (Exception e) {
            LoggerUtils.warn("LiveView scenario-finish publish failed, continuing", e);
        }
    }
}
```

> Note on step text: plain Cucumber hooks don't expose Gherkin text. If the framework already has
> a `ConcurrentEventListener` (most TestHub integrations do), publish `stepStarted` from its
> `TestStepStarted` handler instead — the bridge doesn't care who calls it.

## 4. ScreenshotManager — one line per save

```java
public static String captureStepScreenshot(String name, ScreenshotKind kind) {
    String path = saveScreenshotAsToday(name, kind);   // existing logic, unchanged

    try {
        LiveViewClient.getInstance().screenshotSaved(kind.name(), path); // BEFORE_STEP / AFTER_STEP / FAILURE
    } catch (Exception e) {
        LoggerUtils.warn("LiveView screenshot publish failed, continuing", e);
    }
    return path;
}
```

The dashboard serves the same files ScreenshotManager already writes — no duplication. Start the
server with `LIVEVIEW_SCREENSHOT_BASE_DIR=<framework screenshot root>` so relative paths resolve.
For BrowserStack/SauceLabs runs set `-DliveView.screenshotInline=true` to POST the bytes instead.

## 5. Wrappers — locator events (centralized)

Preferred home: `ElementActionWrapper` / `WaitWrapper`. Until those exist, `CommonUtils` is the
**transitional** integration point — mark it and migrate when wrappers land.

```java
// ElementActionWrapper (or CommonUtils — TRANSITIONAL: move when wrappers exist)
public void tap(PageElement element, String page, String method) {
    long start = System.currentTimeMillis();
    LiveViewClient liveView = LiveViewClient.getInstance();
    try {
        WebElement found = waitWrapper.waitForClickable(element);
        found.click();

        Rectangle r = found.getRect();
        liveView.publishLocator(liveView.newLocatorEvent(element.getStrategy(), element.getLocator())
                .action("tap").page(page).method(method)
                .platform(ConfigManager.getPlatform())
                .waitStrategy("waitForClickable")
                .timeoutMs(waitWrapper.getTimeoutMs())
                .durationMs(System.currentTimeMillis() - start)
                .result("FOUND")
                .bounds(r.getX(), r.getY(), r.getWidth(), r.getHeight()));
    } catch (TimeoutException | NoSuchElementException e) {
        liveView.publishLocator(liveView.newLocatorEvent(element.getStrategy(), element.getLocator())
                .action("tap").page(page).method(method)
                .durationMs(System.currentTimeMillis() - start)
                .result(e instanceof TimeoutException ? "TIMEOUT" : "NOT_FOUND")
                .failure(e));
        throw e;   // framework behavior unchanged
    }
}
```

Never publish locator events from page classes or step definitions.

## 6. LoggerUtils / Log4j2 — log stream

Option A (preferred): register the optional appender in `log4j2.xml`:

```xml
<Configuration packages="com.cashi.liveview">
  <Appenders>
    <LiveView name="LiveView" source="FRAMEWORK"/>
  </Appenders>
  <Loggers>
    <Root level="info">
      <AppenderRef ref="LiveView"/>
      <!-- existing appenders unchanged -->
    </Root>
  </Loggers>
</Configuration>
```

Option B: one line inside `LoggerUtils`:

```java
public static void info(String message) {
    log.info(message);                                              // existing
    LiveViewClient.getInstance().log("FRAMEWORK", "INFO", message); // best-effort no-op when disabled
}
```

Use tagged sources where the framework knows better: `TESTDATA` from UserManager, `API` from API
clients, `RECOVERY`/`SSO`/`POPUP` from the respective handlers — these drive the console filters.

## 7. Parallel execution

The bridge is a process-wide singleton with `ThreadLocal` scenario/step context; events carry
their own ids. Parallel scenarios in one JVM are safe. For multi-JVM forks, each fork publishes
under the same server — runs are keyed by `runId`, so give forks distinct run ids or share one via
a system property.
