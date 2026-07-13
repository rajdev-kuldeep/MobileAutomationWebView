import type { BaseEvent, StepStatus } from './common';
import type { FailureClassification } from './failure';
import type { LocatorEvent } from './locator';

export interface StepEvent extends BaseEvent {
  eventType: 'STEP_STARTED' | 'STEP_PASSED' | 'STEP_FAILED' | 'STEP_SKIPPED';
  scenarioId: string;
  stepId: string;
  keyword?: string;
  stepText?: string;
  status?: StepStatus;
  flow?: string;
  page?: string;
  method?: string;
  durationMs?: number;
  exceptionType?: string;
  message?: string;
  stackTrace?: string;
  failureClassification?: FailureClassification;
  possibleCause?: string;
  recommendedFixLayer?: string;
  doNotFixBy?: string;
  screenshotPath?: string;
}

export interface ScreenshotEvent extends BaseEvent {
  eventType: 'SCREENSHOT_CAPTURED';
  kind?: string; // BEFORE_STEP | AFTER_STEP | FAILURE | MANUAL
  path?: string;
  url?: string;
  width?: number;
  height?: number;
}

/** Aggregated step state maintained client-side (mirrors backend StepState). */
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
