/** Shared primitives mirrored from automation-live-server/src/models/events.ts. */

export type EventType =
  | 'RUN_STARTED'
  | 'RUN_FINISHED'
  | 'SCENARIO_STARTED'
  | 'SCENARIO_FINISHED'
  | 'STEP_STARTED'
  | 'STEP_PASSED'
  | 'STEP_FAILED'
  | 'STEP_SKIPPED'
  | 'LOCATOR_USED'
  | 'SCREENSHOT_CAPTURED'
  | 'LOG'
  | 'DEVICE_INFO'
  | 'FAILURE_CLASSIFIED'
  | 'PAGE_SOURCE_CAPTURED';

export type StepStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
export type RunStatus = 'RUNNING' | 'PASSED' | 'FAILED' | 'ABORTED';
export type Platform = 'Android' | 'iOS';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseEvent {
  eventType: EventType;
  runId: string;
  timestamp: string;
  scenarioId?: string;
  stepId?: string;
  seq?: number;
  receivedAt?: string;
}
