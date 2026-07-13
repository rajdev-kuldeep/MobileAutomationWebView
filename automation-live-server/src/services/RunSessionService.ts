import { createLogger } from '../utils/logger.js';
import { eventBroadcaster } from '../websocket/eventBroadcaster.js';
import { InMemoryEventStore } from '../storage/InMemoryEventStore.js';
import { FileEventStore } from '../storage/FileEventStore.js';
import { newRunSession } from '../models/RunSession.js';
import type { RunSession, ScenarioState, StepState } from '../models/RunSession.js';
import type {
  DeviceInfoEvent,
  FailureClassifiedEvent,
  LiveViewEvent,
  LocatorEvent,
  ScenarioFinishedEvent,
  ScenarioStartedEvent,
  ScreenshotEvent,
  StepEvent,
  StepStatus,
} from '../models/events.js';

const log = createLogger('RunSessionService');

const LOCATOR_HISTORY_LIMIT = 100;

/**
 * The heart of the backend: consumes the raw event stream, maintains the
 * aggregated RunSession state machine, journals every event, and re-publishes
 * to the broadcaster for WebSocket delivery.
 *
 * Thread-safety note: Node is single-threaded per event loop; ingestion order
 * is preserved per HTTP request. Events carry framework timestamps for
 * cross-thread ordering concerns on the Java side.
 */
export class RunSessionService {
  private runs = new Map<string, RunSession>();
  private currentRunId?: string;
  private seq = 0;

  constructor(
    private readonly memoryStore: InMemoryEventStore,
    private readonly fileStore: FileEventStore,
  ) {}

  /** Ingest a single event: normalize → aggregate → journal → broadcast. */
  ingest(event: LiveViewEvent): LiveViewEvent {
    event.seq = ++this.seq;
    event.receivedAt = new Date().toISOString();

    const run = this.getOrCreateRun(event.runId);
    this.apply(run, event);

    this.memoryStore.append(event);
    this.fileStore.append(event);
    eventBroadcaster.publishEvent(event);
    return event;
  }

  getCurrentRun(): RunSession | undefined {
    return this.currentRunId ? this.runs.get(this.currentRunId) : undefined;
  }

  getRun(runId: string): RunSession | undefined {
    return this.runs.get(runId);
  }

  listRunIds(): string[] {
    const inMemory = [...this.runs.keys()];
    const onDisk = this.fileStore.listRuns();
    return [...new Set([...inMemory, ...onDisk])];
  }

  private getOrCreateRun(runId: string): RunSession {
    let run = this.runs.get(runId);
    if (!run) {
      run = newRunSession(runId);
      this.runs.set(runId, run);
      this.currentRunId = runId;
      log.info(`tracking new run ${runId}`);
    }
    // Any activity on a run makes it "current" — supports sequential runs
    // without restarting the server.
    if (this.currentRunId !== runId) this.currentRunId = runId;
    return run;
  }

  private apply(run: RunSession, event: LiveViewEvent): void {
    switch (event.eventType) {
      case 'RUN_STARTED': {
        run.project = event.project;
        run.module = event.module;
        run.environment = event.environment;
        run.executionMode = event.executionMode;
        run.platform = event.platform;
        run.testHubUrl = event.testHubUrl;
        run.status = 'RUNNING';
        run.startedAt = event.timestamp;
        break;
      }
      case 'RUN_FINISHED': {
        run.status = event.status ?? (run.counters.failedSteps > 0 ? 'FAILED' : 'PASSED');
        run.finishedAt = event.timestamp;
        run.currentStepId = undefined;
        this.fileStore.close(run.runId);
        break;
      }
      case 'SCENARIO_STARTED': {
        const e = event as ScenarioStartedEvent;
        const scenario = this.getOrCreateScenario(run, e.scenarioId);
        scenario.featureName = e.featureName;
        scenario.scenarioName = e.scenarioName;
        scenario.tags = e.tags ?? [];
        scenario.status = 'RUNNING';
        scenario.startedAt = e.timestamp;
        run.currentScenarioId = e.scenarioId;
        break;
      }
      case 'SCENARIO_FINISHED': {
        const e = event as ScenarioFinishedEvent;
        const scenario = this.getOrCreateScenario(run, e.scenarioId);
        scenario.status = e.status ?? 'PASSED';
        scenario.finishedAt = e.timestamp;
        scenario.durationMs = e.durationMs;
        break;
      }
      case 'STEP_STARTED':
      case 'STEP_PASSED':
      case 'STEP_FAILED':
      case 'STEP_SKIPPED': {
        this.applyStepEvent(run, event as StepEvent);
        break;
      }
      case 'LOCATOR_USED': {
        const e = event as LocatorEvent;
        run.locatorHistory.push(e);
        if (run.locatorHistory.length > LOCATOR_HISTORY_LIMIT) {
          run.locatorHistory.splice(0, run.locatorHistory.length - LOCATOR_HISTORY_LIMIT);
        }
        const step = this.findStep(run, e.scenarioId, e.stepId);
        if (step) step.locators.push(e);
        break;
      }
      case 'SCREENSHOT_CAPTURED': {
        const e = event as ScreenshotEvent;
        run.lastScreenshot = e;
        const step = this.findStep(run, e.scenarioId, e.stepId);
        if (step) step.screenshots.push(e);
        break;
      }
      case 'DEVICE_INFO': {
        run.deviceInfo = event as DeviceInfoEvent;
        if (!run.platform) run.platform = run.deviceInfo.platform;
        break;
      }
      case 'FAILURE_CLASSIFIED': {
        run.lastFailure = event as FailureClassifiedEvent;
        break;
      }
      case 'LOG':
      case 'PAGE_SOURCE_CAPTURED':
        // Not part of aggregate state; stored + broadcast only.
        break;
    }
  }

  private applyStepEvent(run: RunSession, event: StepEvent): void {
    const scenario = this.getOrCreateScenario(run, event.scenarioId);
    let step = scenario.steps[event.stepId];
    if (!step) {
      step = {
        stepId: event.stepId,
        scenarioId: event.scenarioId,
        index: scenario.stepOrder.length,
        status: 'PENDING',
        screenshots: [],
        locators: [],
      };
      scenario.steps[event.stepId] = step;
      scenario.stepOrder.push(event.stepId);
      run.counters.totalSteps += 1;
    }
    if (event.keyword) step.keyword = event.keyword;
    if (event.stepText) step.stepText = event.stepText;
    if (event.flow) step.flow = event.flow;
    if (event.page) step.page = event.page;
    if (event.method) step.method = event.method;

    switch (event.eventType) {
      case 'STEP_STARTED':
        step.status = 'RUNNING';
        step.startedAt = event.timestamp;
        run.currentScenarioId = event.scenarioId;
        run.currentStepId = event.stepId;
        break;
      case 'STEP_PASSED':
        this.finishStep(run, step, 'PASSED', event);
        run.counters.passedSteps += 1;
        break;
      case 'STEP_FAILED':
        this.finishStep(run, step, 'FAILED', event);
        run.counters.failedSteps += 1;
        step.exceptionType = event.exceptionType;
        step.message = event.message;
        step.stackTrace = event.stackTrace;
        break;
      case 'STEP_SKIPPED':
        this.finishStep(run, step, 'SKIPPED', event);
        run.counters.skippedSteps += 1;
        break;
    }
  }

  private finishStep(run: RunSession, step: StepState, status: StepStatus, event: StepEvent): void {
    step.status = status;
    step.finishedAt = event.timestamp;
    step.durationMs =
      event.durationMs ??
      (step.startedAt
        ? Math.max(0, Date.parse(event.timestamp) - Date.parse(step.startedAt))
        : undefined);
    if (run.currentStepId === step.stepId) run.currentStepId = undefined;
  }

  private getOrCreateScenario(run: RunSession, scenarioId: string): ScenarioState {
    let scenario = run.scenarios[scenarioId];
    if (!scenario) {
      scenario = {
        scenarioId,
        tags: [],
        status: 'PENDING',
        stepOrder: [],
        steps: {},
      };
      run.scenarios[scenarioId] = scenario;
      run.scenarioOrder.push(scenarioId);
    }
    return scenario;
  }

  private findStep(
    run: RunSession,
    scenarioId?: string,
    stepId?: string,
  ): StepState | undefined {
    if (!scenarioId || !stepId) return undefined;
    return run.scenarios[scenarioId]?.steps[stepId];
  }
}
