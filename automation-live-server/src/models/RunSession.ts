import type {
  DeviceInfoEvent,
  FailureClassifiedEvent,
  LocatorEvent,
  Platform,
  RunStatus,
  ScreenshotEvent,
  StepStatus,
} from './events.js';

/** Aggregated, queryable state of a single run, built from the event stream. */
export interface StepState {
  stepId: string;
  scenarioId: string;
  index: number;
  keyword?: string;
  stepText?: string;
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  flow?: string;
  page?: string;
  method?: string;
  exceptionType?: string;
  message?: string;
  stackTrace?: string;
  screenshots: ScreenshotEvent[];
  locators: LocatorEvent[];
}

export interface ScenarioState {
  scenarioId: string;
  featureName?: string;
  scenarioName?: string;
  tags: string[];
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  stepOrder: string[];
  steps: Record<string, StepState>;
}

export interface RunCounters {
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
}

export interface RunSession {
  runId: string;
  project?: string;
  module?: string;
  environment?: string;
  executionMode?: string;
  platform?: Platform;
  testHubUrl?: string;
  status: RunStatus;
  startedAt?: string;
  finishedAt?: string;
  scenarioOrder: string[];
  scenarios: Record<string, ScenarioState>;
  currentScenarioId?: string;
  currentStepId?: string;
  counters: RunCounters;
  deviceInfo?: DeviceInfoEvent;
  lastFailure?: FailureClassifiedEvent;
  lastScreenshot?: ScreenshotEvent;
  locatorHistory: LocatorEvent[];
}

export function newRunSession(runId: string): RunSession {
  return {
    runId,
    status: 'RUNNING',
    scenarioOrder: [],
    scenarios: {},
    counters: { totalSteps: 0, passedSteps: 0, failedSteps: 0, skippedSteps: 0 },
    locatorHistory: [],
  };
}
