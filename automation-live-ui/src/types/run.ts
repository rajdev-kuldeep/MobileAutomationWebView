import type { BaseEvent, Platform, RunStatus, StepStatus } from './common';
import type { StepState, ScreenshotEvent, StepEvent } from './step';
import type { DeviceInfoEvent } from './device';
import type { FailureClassifiedEvent } from './failure';
import type { LocatorEvent } from './locator';
import type { LogEvent } from './log';

export interface RunStartedEvent extends BaseEvent {
  eventType: 'RUN_STARTED';
  project: string;
  module: string;
  environment: string;
  executionMode: string;
  platform: Platform;
  testHubUrl?: string;
}

export interface RunFinishedEvent extends BaseEvent {
  eventType: 'RUN_FINISHED';
  status: RunStatus;
}

export interface ScenarioStartedEvent extends BaseEvent {
  eventType: 'SCENARIO_STARTED';
  scenarioId: string;
  featureName: string;
  scenarioName: string;
  tags?: string[];
}

export interface ScenarioFinishedEvent extends BaseEvent {
  eventType: 'SCENARIO_FINISHED';
  scenarioId: string;
  status: StepStatus;
  durationMs?: number;
}

export interface PageSourceEvent extends BaseEvent {
  eventType: 'PAGE_SOURCE_CAPTURED';
  url?: string;
  path?: string;
}

export type LiveViewEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | ScenarioStartedEvent
  | ScenarioFinishedEvent
  | StepEvent
  | LocatorEvent
  | ScreenshotEvent
  | LogEvent
  | DeviceInfoEvent
  | FailureClassifiedEvent
  | PageSourceEvent;

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
