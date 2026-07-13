import { create } from 'zustand';
import type { LiveViewEvent, RunSession, ScenarioState } from '../types/run';
import type { StepEvent, StepState, ScreenshotEvent } from '../types/step';
import type { LocatorEvent } from '../types/locator';
import type { DeviceInfoEvent } from '../types/device';
import type { FailureClassifiedEvent } from '../types/failure';
import type { StepStatus } from '../types/common';

/**
 * Client-side mirror of the backend run state machine. A full snapshot
 * arrives in the WebSocket "hello" message; individual events keep it
 * up to date afterwards. Immutable-ish updates: we clone the run shell and
 * touched scenario/step so React re-renders precisely.
 */
interface RunStore {
  run: RunSession | null;
  connection: 'connecting' | 'open' | 'closed';
  setSnapshot: (run: RunSession | null) => void;
  setConnection: (state: 'connecting' | 'open' | 'closed') => void;
  applyEvent: (event: LiveViewEvent) => void;
}

function emptyRun(runId: string): RunSession {
  return {
    runId,
    status: 'RUNNING',
    scenarioOrder: [],
    scenarios: {},
    counters: { totalSteps: 0, passedSteps: 0, failedSteps: 0, skippedSteps: 0 },
    locatorHistory: [],
  };
}

const LOCATOR_HISTORY_LIMIT = 100;

export const useRunStore = create<RunStore>((set, get) => ({
  run: null,
  connection: 'connecting',

  setSnapshot: (run) => set({ run }),
  setConnection: (connection) => set({ connection }),

  applyEvent: (event) => {
    if (event.eventType === 'LOG') return; // handled by logStore

    const prev = get().run;
    // A new runId replaces the tracked run (sequential runs, same server).
    const base = prev && prev.runId === event.runId ? prev : emptyRun(event.runId);
    const run: RunSession = { ...base, scenarios: { ...base.scenarios } };

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
        break;
      }
      case 'SCENARIO_STARTED': {
        const scenario = getScenario(run, event.scenarioId);
        scenario.featureName = event.featureName;
        scenario.scenarioName = event.scenarioName;
        scenario.tags = event.tags ?? [];
        scenario.status = 'RUNNING';
        scenario.startedAt = event.timestamp;
        run.currentScenarioId = event.scenarioId;
        break;
      }
      case 'SCENARIO_FINISHED': {
        const scenario = getScenario(run, event.scenarioId);
        scenario.status = event.status ?? 'PASSED';
        scenario.finishedAt = event.timestamp;
        scenario.durationMs = event.durationMs;
        break;
      }
      case 'STEP_STARTED':
      case 'STEP_PASSED':
      case 'STEP_FAILED':
      case 'STEP_SKIPPED': {
        applyStep(run, event as StepEvent);
        break;
      }
      case 'LOCATOR_USED': {
        const e = event as LocatorEvent;
        run.locatorHistory = [...run.locatorHistory, e].slice(-LOCATOR_HISTORY_LIMIT);
        const step = findStep(run, e.scenarioId, e.stepId);
        if (step) step.locators = [...step.locators, e];
        break;
      }
      case 'SCREENSHOT_CAPTURED': {
        const e = event as ScreenshotEvent;
        run.lastScreenshot = e;
        const step = findStep(run, e.scenarioId, e.stepId);
        if (step) step.screenshots = [...step.screenshots, e];
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
      case 'PAGE_SOURCE_CAPTURED':
        break;
    }

    set({ run });
  },
}));

function getScenario(run: RunSession, scenarioId: string): ScenarioState {
  let scenario = run.scenarios[scenarioId];
  if (!scenario) {
    scenario = { scenarioId, tags: [], status: 'PENDING', stepOrder: [], steps: {} };
    run.scenarioOrder = [...run.scenarioOrder, scenarioId];
  } else {
    scenario = { ...scenario, steps: { ...scenario.steps } };
  }
  run.scenarios[scenarioId] = scenario;
  return scenario;
}

function findStep(run: RunSession, scenarioId?: string, stepId?: string): StepState | undefined {
  if (!scenarioId || !stepId) return undefined;
  const scenario = run.scenarios[scenarioId];
  const step = scenario?.steps[stepId];
  if (!scenario || !step) return undefined;
  const copy = { ...step };
  const scenarioCopy = { ...scenario, steps: { ...scenario.steps, [stepId]: copy } };
  run.scenarios[scenarioId] = scenarioCopy;
  return copy;
}

function applyStep(run: RunSession, event: StepEvent): void {
  const scenario = getScenario(run, event.scenarioId);
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
    scenario.stepOrder = [...scenario.stepOrder, event.stepId];
    run.counters = { ...run.counters, totalSteps: run.counters.totalSteps + 1 };
  } else {
    step = { ...step };
  }
  scenario.steps[event.stepId] = step;

  if (event.keyword) step.keyword = event.keyword;
  if (event.stepText) step.stepText = event.stepText;
  if (event.flow) step.flow = event.flow;
  if (event.page) step.page = event.page;
  if (event.method) step.method = event.method;

  const finish = (status: StepStatus) => {
    step!.status = status;
    step!.finishedAt = event.timestamp;
    step!.durationMs =
      event.durationMs ??
      (step!.startedAt
        ? Math.max(0, Date.parse(event.timestamp) - Date.parse(step!.startedAt))
        : undefined);
    if (run.currentStepId === step!.stepId) run.currentStepId = undefined;
  };

  switch (event.eventType) {
    case 'STEP_STARTED':
      step.status = 'RUNNING';
      step.startedAt = event.timestamp;
      run.currentScenarioId = event.scenarioId;
      run.currentStepId = event.stepId;
      break;
    case 'STEP_PASSED':
      finish('PASSED');
      run.counters = { ...run.counters, passedSteps: run.counters.passedSteps + 1 };
      break;
    case 'STEP_FAILED':
      finish('FAILED');
      run.counters = { ...run.counters, failedSteps: run.counters.failedSteps + 1 };
      step.exceptionType = event.exceptionType;
      step.message = event.message;
      step.stackTrace = event.stackTrace;
      break;
    case 'STEP_SKIPPED':
      finish('SKIPPED');
      run.counters = { ...run.counters, skippedSteps: run.counters.skippedSteps + 1 };
      break;
  }
}
