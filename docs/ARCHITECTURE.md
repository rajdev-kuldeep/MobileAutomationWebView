# Cashi Automation Live View — Architecture

A real-time mobile automation observability platform for **CashiUIAutomation / CashiMobileAutomation**.
It answers, live: *What test is running? Which step is executing? What is visible on the device?
Which locator is being used? What logs are generated? Why did the failure happen? Where should the fix be made?*

---

## 1. System Overview

```text
┌──────────────────────────────┐
│  CashiMobileAutomation (JVM) │
│                              │
│  RunnerBase ─┐               │
│  Hooks ──────┤               │
│  Screenshot  ├─► LiveViewClient ── async queue ── HTTP POST /api/events
│  Manager     │   (best-effort,                      (JSON, batched)
│  LoggerUtils │    non-blocking)                          │
│  Wrappers ───┘               │                           ▼
└──────────────────────────────┘            ┌───────────────────────────────┐
                                            │  automation-live-server       │
        adb / simctl                        │  (Node.js + Express + ws)     │
┌──────────────┐   screen frames            │                               │
│ Emulator /   │◄───────────────────────────┤  RunSessionService (state)    │
│ Simulator /  │                            │  ScreenshotService            │
│ Device       │                            │  LocatorEventService          │
└──────────────┘                            │  FailureAnalysisService       │
                                            │  DeviceStreamService          │
                                            │  InMemory + File (JSONL)      │
                                            └──────────────┬────────────────┘
                                                           │ WS /ws/live + REST
                                                           ▼
                                            ┌───────────────────────────────┐
                                            │  automation-live-ui           │
                                            │  (React 18 + TS + Vite +      │
                                            │   Zustand)                    │
                                            │  http://localhost:4545        │
                                            └───────────────────────────────┘
```

**Boundaries (by design):**
- The Java bridge knows only the event JSON contract — nothing about the frontend.
- The backend knows nothing about Cucumber internals — it consumes typed events.
- UI components read Zustand stores only — they never touch backend internals.
- Device streaming is adapter-based and replaceable (adb → scrcpy/MJPEG later).
- Storage is replaceable (`InMemoryEventStore` + `FileEventStore` behind `RunSessionService`).

---

## 2. Repository Layout

```text
/
├── automation-live-server/   Node.js + Express + WebSocket backend
├── automation-live-ui/       React + TypeScript + Vite frontend
├── java-bridge/              Drop-in com.cashi.liveview package for the framework
│   └── optional/             Log4j2 appender (needs log4j-core at compile time)
├── docs/                     This file + JAVA_INTEGRATION.md
├── scripts/simulate-run.mjs  Fake test run for demos / E2E smoke tests
└── start-live-view.sh        One-command local startup
```

### Backend (`automation-live-server/src`)

```text
index.ts                composition root; serves built UI at :4545
config/serverConfig.ts  env-overridable configuration
routes/                 eventRoutes, runRoutes, deviceRoutes, screenshotRoutes,
                        logRoutes, pageSourceRoutes
websocket/              socketServer (ws), eventBroadcaster (internal bus)
services/               RunSessionService, ScreenshotService, LogIngestionService,
                        LocatorEventService, FailureAnalysisService,
                        PageSourceService, DeviceStreamService
adapters/               ScreenshotSourceAdapter (interface),
                        AdbScreenshotAdapter, IosSimulatorScreenshotAdapter
models/                 events.ts (canonical contract), RunSession.ts
storage/                InMemoryEventStore (bounded), FileEventStore (JSONL journal)
```

### Frontend (`automation-live-ui/src`)

```text
app/                    App.tsx, main.tsx
components/layout/      AppShell, HeaderBar, SidePanel, BottomConsole
components/device/      DeviceLiveView, DeviceFrame, ScreenshotViewer, ElementOverlay
components/timeline/    ScenarioTimeline, StepItem, StepDetails
components/locator/     LocatorInspector, LocatorHistory, LocatorQualityBadge
components/console/     LogConsole, LogFilterBar, LogRow
components/failure/     FailurePanel, FailureClassification
components/session/     DeviceSessionPanel
hooks/                  useLiveEvents, useDeviceStream, useLogFilters,
                        useSelectedStep, usePanelResize
store/                  runStore, deviceStore, logStore, locatorStore, uiStore
types/                  common, run, step, device, locator, log, failure
services/               websocketClient (reconnecting), apiClient
styles/global.css       design tokens; dark-first with light theme
```

### Java bridge (`java-bridge/src/main/java/com/cashi/liveview`)

```text
LiveViewClient.java          public facade (the ONLY class the framework calls)
LiveViewConfig.java          -DliveView.* properties / env vars
LiveViewEventPublisher.java  daemon worker: bounded queue, batching, circuit breaker
LiveViewEvent.java           base event + Json.java (zero-dependency writer)
LiveViewRunEvent / LiveViewScenarioEvent / LiveViewStepEvent /
LiveViewLocatorEvent / LiveViewLogEvent / LiveViewFailureEvent /
LiveViewDeviceInfo / LiveViewScreenshotEvent / LiveViewPageSourceEvent
optional/LiveViewLog4j2Appender.java   log stream bridge (needs log4j-core)
```

---

## 3. Event Model

All events share `eventType`, `runId`, `timestamp` (ISO-8601 with offset) and optional
`scenarioId` / `stepId`. The server stamps `seq` and `receivedAt` on ingestion.
Canonical types live in `automation-live-server/src/models/events.ts` and are mirrored in
`automation-live-ui/src/types/` — keep them in sync.

| eventType | Publisher | Purpose |
|---|---|---|
| `RUN_STARTED` / `RUN_FINISHED` | RunnerBase | run identity, env, platform, mode, TestHub URL |
| `SCENARIO_STARTED` / `SCENARIO_FINISHED` | Hooks | feature, scenario, tags, outcome |
| `STEP_STARTED` / `STEP_PASSED` / `STEP_FAILED` / `STEP_SKIPPED` | Hooks | Gherkin keyword/text, page/flow/method, duration, exception |
| `LOCATOR_USED` | Wrappers | strategy, locator, wait config, result, bounds, retries |
| `SCREENSHOT_CAPTURED` | ScreenshotManager | kind (BEFORE_STEP/AFTER_STEP/FAILURE), path or inline base64 |
| `LOG` | LoggerUtils / Log4j2 appender | source, level, message |
| `DEVICE_INFO` | driver setup | capabilities, ports, session ids |
| `FAILURE_CLASSIFIED` | Hooks (or server heuristics) | classification + AI-ready hints |
| `PAGE_SOURCE_CAPTURED` | failure handling | XML snapshot (persisted server-side) |

Example payloads are in the JSON blocks inside `scripts/simulate-run.mjs`, which is the living,
executable specification of the contract.

**Failure classifications:** `APP_ISSUE`, `AUTOMATION_ISSUE`, `TEST_DATA_ISSUE`,
`ENVIRONMENT_ISSUE`, `API_DEPENDENCY_ISSUE`, `DEVICE_SESSION_ISSUE`, `FRAMEWORK_ISSUE`,
`UNKNOWN_REQUIRES_INVESTIGATION`. If the framework does not publish `FAILURE_CLASSIFIED`,
`FailureAnalysisService` derives one heuristically from the `STEP_FAILED` payload so the panel
is never empty.

**Locator quality grading** (server-side when the bridge doesn't grade):
`GOOD` (resource-id / accessibility id) → `ACCEPTABLE` (UiSelector/predicate/class-chain) →
`RISKY` (relative XPath) → `BAD` (absolute XPath, with a brittleness warning in the UI).

---

## 4. API Contract

| Method & Path | Description |
|---|---|
| `GET /health` | liveness + current run id |
| `POST /api/events` | ingest one event or an array (bridge batches); replies `202 {accepted, errors}` |
| `GET /api/runs` | known run ids (memory + journal) |
| `GET /api/runs/current` | aggregated `RunSession` for the active run |
| `GET /api/runs/:runId` | aggregated state for a specific run |
| `GET /api/runs/:runId/events` | full event journal (export / AI analysis / replay) |
| `GET /api/screenshots/latest` | metadata of the newest screenshot |
| `GET /api/screenshots/:runId/:id` | serve a screenshot published inline |
| `GET /api/screenshots/file?path=` | serve a framework-saved screenshot (sandboxed to allowed roots) |
| `GET /api/logs?runId&stepId&source&level&search&limit` | query ingested logs |
| `GET /api/device/current` | device info + stream status |
| `GET /api/device/frame?seq=N` | latest live device frame (PNG; seq is a cache-buster) |
| `GET /api/page-source/latest?runId=` | latest page-source snapshot metadata |
| `GET /api/page-source/:runId/:id` | download a page-source XML |

## 5. WebSocket Contract — `ws://localhost:4545/ws/live`

Server → client:

```jsonc
{ "type": "hello", "run": { /* RunSession snapshot */ }, "streamStatus": {...}, "recentLogs": [...] }
{ "type": "event", "event": { /* any ingested LiveViewEvent */ } }
{ "type": "frame", "seq": 42, "source": "adb", "timestamp": "..." }   // fetch via GET /api/device/frame
{ "type": "pong" }
```

Client → server: `{ "type": "ping" }`.
Frames are **notified** over WS but **fetched** over HTTP so the socket stays light and browser
image caching works. The client reconnects with exponential backoff and receives a fresh snapshot
on every reconnect — no missed-event bookkeeping needed.

---

## 6. Device Streaming

`DeviceStreamService` probes configured adapters in order (`LIVEVIEW_DEVICE_STREAM_SOURCES`,
default `adb,simctl`) and polls the first available one (default 800 ms, min 300 ms — deliberately
not aggressive):

1. **Android** — `adb exec-out screencap -p` (emulator + physical, no device file round-trip)
2. **iOS Simulator** — `xcrun simctl io booted screenshot -` (macOS only)
3. **iOS physical / remote clouds** — no local adapter; the dashboard falls back automatically to
   the framework's step screenshots (published by ScreenshotManager via the bridge), which also
   covers BrowserStack/SauceLabs/Looper today.

Rules: polling runs **only while browser clients are connected**; 3 consecutive capture failures
→ fall back and re-probe every 15 s; the automation run is never touched — streaming is fully
out-of-band. The UI shows `Live device stream unavailable → falling back to latest step screenshot`.

Phase 3 replaces polling with an scrcpy/MJPEG adapter behind the same `ScreenshotSourceAdapter`
interface — no consumer changes.

---

## 7. UI Design

Dark-first (light theme via `data-theme`), DevTools/Trace-Viewer aesthetic, resizable +
collapsible panels:

```text
┌ HeaderBar: run id · scenario · env/platform/mode badges · ✓✗− counters · duration · status pill ┐
├ Timeline (left)      │ Device Live View (center)      │ Locator / Session / Failure (right tabs) ┤
│  feature → scenario  │  live frames or step screenshot │  current locator + quality badge          │
│  → steps w/ status,  │  zoom/fit/rotate/bezel toggle   │  history, warnings, page-source link      │
│  durations, errors   │  element bounding-box overlay   │  failure classification + AI hints        │
├ Log console (bottom): level select · source chips · search/regex · pause · autoscroll · export ──┤
└ collapse bar ────────────────────────────────────────────────────────────────────────────────────┘
```

Selecting a past step opens **StepDetails** (before/after/failure screenshots, locators, error,
"logs for this step" console filter); the **Follow** toggle returns to live-tracking.

---

## 8. Integration Plan (existing framework)

See `docs/JAVA_INTEGRATION.md` for copy-paste code. Summary — the only allowed touch points:

| Framework layer | Publishes | Notes |
|---|---|---|
| **RunnerBase** | RUN_STARTED / RUN_FINISHED, TestHub URL | `@BeforeSuite` / `@AfterSuite` |
| **Hooks** | scenario + step lifecycle, FAILURE_CLASSIFIED | Cucumber `@Before/@After/@BeforeStep/@AfterStep`; existing screenshot-per-step and TestHub logic untouched |
| **ScreenshotManager** | SCREENSHOT_CAPTURED (by path) | one line after each existing save — reuses the same files, no duplicate pipeline |
| **DriverManager / capability setup** | DEVICE_INFO | after session creation |
| **LoggerUtils / log4j2.xml** | LOG | optional appender; async, never slows tests |
| **ElementActionWrapper / WaitWrapper** (or `CommonUtils` transitionally) | LOCATOR_USED | centralized — never per page class, never in step definitions |

Anti-patterns enforced by construction: no dashboard code in feature files or step definitions,
no `Thread.sleep` syncing, no static per-scenario state (bridge uses `ThreadLocal` for
scenario/step context → parallel-safe), no hardcoded device ids.

---

## 9. Non-Blocking Guarantees

- `liveView.enabled=false` (default) → the bridge is a pile of no-ops.
- `offer()` never blocks: full queue → event dropped + counter incremented.
- One daemon thread posts batches (≤25 events) with 1 s connect / 2 s request timeouts.
- Circuit breaker: 3 consecutive failures → 10 s quiet period, single stderr warning
  (`dashboard unreachable … test execution continues normally`), then retry.
- JVM shutdown hook flushes the queue tail for ≤2 s, then gives up.
- `liveView.failOnPublishError=true` exists only for debugging the bridge itself — never in CI.

---

## 10. Roadmap

**MVP (this delivery):** local dashboard at `localhost:4545`; run/scenario/step timeline; device
view (live adb/simctl polling with screenshot fallback); locator inspector + quality badges +
history; filtered log console (search, regex, pause, export, per-step); failure panel with
classification + AI hints; device/session panel; WebSocket live updates with snapshot-on-connect;
JSONL journal + run export endpoint; run simulator; startup script. Verified end-to-end with a
browser (see `docs/` screenshots discussion in the PR).

**Phase 2:** step screenshot diff view; wait/gesture/recovery event types; log virtualization for
100k+ lines; multi-run browsing UI over `GET /api/runs`; locator flakiness stats (same locator
across runs); Looper CI ingestion (bridge already batches; add auth token + remote URL config);
inline screenshot mode hardening for BrowserStack/SauceLabs.

**Phase 3:** scrcpy/MJPEG true video adapter; interactive page-source viewer with element pick →
locator suggestions; AI failure analysis endpoint (`GET /api/runs/:id/events` is already the
feature store); historical run replay (journal-driven timeline scrubbing); multi-device parallel
grid view; TestHub deep links both ways.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Dashboard outage affects tests | best-effort publisher, bounded queue, circuit breaker, disabled by default |
| Event flood (logs) slows server/UI | batching, bounded ring buffers (server + client), render cap in console, journal on disk |
| Screenshot volume (inline mode) | path mode preferred locally; inline persisted to disk and URL-rewritten before broadcast; 25 MB body cap |
| Path traversal via screenshot path API | resolution sandboxed to `screenshotBaseDir` + data dir |
| adb polling steals device bandwidth | ≥300 ms interval floor, polls only with connected clients, stops when idle |
| Parallel scenarios interleaving state | events carry ids; `ThreadLocal` context in bridge; server state keyed by scenario/step id |
| Contract drift between TS/Java | single canonical model file + simulator as executable contract test |
| Memory growth on long runs | ring buffers with caps; full history only in JSONL journal |

---

## 12. Acceptance Criteria (verified)

1. ✅ Dashboard opens at `http://localhost:4545` while a run executes.
2. ✅ Live scenario/step progress with statuses and durations.
3. ✅ Device screen shown (live frames when adb/simctl available; screenshot fallback otherwise).
4. ✅ Locator info for the current action, with quality badges and history.
5. ✅ Logs with source/level filters, search, regex, pause, export.
6. ✅ Automation continues when the dashboard is down (non-blocking publisher).
7. ✅ Zero dashboard code in feature files; step definitions untouched.
8. ✅ ScreenshotManager/TestHub flows unmodified — bridge only *adds* one-line publishes.
9. ✅ Modular: adapters, stores, services all replaceable behind interfaces.
10. ✅ Modern DevTools-style UI, dark/light.
11. ✅ Structured event journal + REST export for future AI agents.
