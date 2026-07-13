# Cashi Automation Live View

A real-time **mobile automation command center** for CashiUIAutomation / CashiMobileAutomation.
Watch the live device screen, Cucumber scenario/step progress, locator usage, logs, and failure
analysis — all in one local dashboard while the test runs.

```text
┌ Run ID · Scenario · Env · Platform · ✓✗ counters · Duration · Status ┐
├ Timeline          │ Live Device View          │ Locator Inspector    ┤
│ feature/scenario/ │ adb / simctl frames or    │ Session panel        │
│ steps, statuses   │ step-screenshot fallback  │ Failure debug + AI   │
├ Log console: source & level filters · search · regex · pause · export┤
└──────────────────────────────────────────────────────────────────────┘
```

## Quick start

```bash
./start-live-view.sh                # dashboard at http://localhost:4545
./start-live-view.sh --simulate     # + a fake Banking Login run (no device needed)
./start-live-view.sh --dev          # backend + Vite HMR dev server on :5173
```

Then run the automation with the bridge enabled:

```bash
mvn test -DsuiteXmlFile=local_android_debug.xml -DliveView.enabled=true
```

If the dashboard is down, disabled, or unreachable, **automation is unaffected** — the Java bridge
is asynchronous, batched, circuit-broken, and best-effort by design.

## Repository layout

| Directory | What it is |
|---|---|
| `automation-live-server/` | Node.js + Express + WebSocket backend (event ingestion, run state, device streaming, journal) |
| `automation-live-ui/` | React 18 + TypeScript + Vite + Zustand dashboard |
| `java-bridge/` | Drop-in `com.cashi.liveview` package for CashiMobileAutomation (zero dependencies) |
| `scripts/simulate-run.mjs` | Simulated test run — demo, development, and executable contract test |
| `docs/ARCHITECTURE.md` | Architecture, event model, API/WS contracts, roadmap, risks |
| `docs/JAVA_INTEGRATION.md` | Copy-paste integration for RunnerBase, Hooks, ScreenshotManager, LoggerUtils, wrappers |

## Development

```bash
# backend
cd automation-live-server && npm install && npm run dev     # tsx watch on :4545

# frontend (proxies /api and /ws to :4545)
cd automation-live-ui && npm install && npm run dev         # Vite on :5173

# feed it events
node scripts/simulate-run.mjs           # real-time pacing
node scripts/simulate-run.mjs --fast    # 20x for smoke tests
node scripts/simulate-run.mjs --fail    # exercise the failure panel
```

Production mode: `npm run build` in both packages; the server serves the built UI at
`http://localhost:4545` (single port, same origin for REST + WebSocket).

## Key guarantees

- **Non-blocking:** the bridge never blocks a test thread; full queue drops events; 3 failed
  posts open a 10 s circuit breaker with a single warning.
- **Clean framework:** integration only via Hooks, RunnerBase, ScreenshotManager, LoggerUtils and
  action wrappers — never in feature files, step definitions, or page classes.
- **Reuses existing screenshots:** the dashboard serves the files ScreenshotManager already
  writes; inline upload exists for remote (BrowserStack/SauceLabs) runs.
- **AI-ready:** every run has a JSONL journal and `GET /api/runs/:runId/events` export with
  structured locator, failure-classification, and log events.
