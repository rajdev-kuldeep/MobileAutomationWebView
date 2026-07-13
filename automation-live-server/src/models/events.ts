/**
 * Canonical event model for Cashi Automation Live View.
 *
 * Every payload posted by the Java bridge to POST /api/events conforms to
 * one of these shapes. The same model is mirrored on the frontend in
 * automation-live-ui/src/types. Keep the two in sync.
 */

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
export type LocatorQuality = 'GOOD' | 'ACCEPTABLE' | 'RISKY' | 'BAD';
export type LocatorResult = 'FOUND' | 'NOT_FOUND' | 'STALE' | 'TIMEOUT' | 'ERROR';

export type LogSource =
  | 'FRAMEWORK'
  | 'CUCUMBER'
  | 'APPIUM'
  | 'DEVICE'
  | 'API'
  | 'LOCATOR'
  | 'SCREENSHOT'
  | 'TESTDATA'
  | 'RECOVERY'
  | 'SSO'
  | 'POPUP'
  | 'TESTHUB'
  | 'LIVEVIEW';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

export type FailureClassification =
  | 'APP_ISSUE'
  | 'AUTOMATION_ISSUE'
  | 'TEST_DATA_ISSUE'
  | 'ENVIRONMENT_ISSUE'
  | 'API_DEPENDENCY_ISSUE'
  | 'DEVICE_SESSION_ISSUE'
  | 'FRAMEWORK_ISSUE'
  | 'UNKNOWN_REQUIRES_INVESTIGATION';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Fields common to every event. */
export interface BaseEvent {
  eventType: EventType;
  runId: string;
  timestamp: string; // ISO-8601 with offset
  scenarioId?: string;
  stepId?: string;
  /** Assigned by the server on ingestion. */
  seq?: number;
  receivedAt?: string;
}

export interface RunStartedEvent extends BaseEvent {
  eventType: 'RUN_STARTED';
  project: string;
  module: string;
  environment: string;
  executionMode: string; // local | browserstack | saucelabs | looper
  platform: Platform;
  testHubUrl?: string;
}

export interface RunFinishedEvent extends BaseEvent {
  eventType: 'RUN_FINISHED';
  status: RunStatus;
  totalScenarios?: number;
  passedScenarios?: number;
  failedScenarios?: number;
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

export interface StepEvent extends BaseEvent {
  eventType: 'STEP_STARTED' | 'STEP_PASSED' | 'STEP_FAILED' | 'STEP_SKIPPED';
  scenarioId: string;
  stepId: string;
  keyword?: string; // Given / When / Then / And / But
  stepText?: string;
  status?: StepStatus;
  flow?: string;
  page?: string;
  method?: string;
  durationMs?: number;
  // Failure-only fields
  exceptionType?: string;
  message?: string;
  stackTrace?: string;
  failureClassification?: FailureClassification;
  possibleCause?: string;
  recommendedFixLayer?: string;
  doNotFixBy?: string;
  screenshotPath?: string;
}

export interface LocatorEvent extends BaseEvent {
  eventType: 'LOCATOR_USED';
  page?: string;
  method?: string;
  action?: string; // click | sendKeys | getText | waitFor...
  platform?: Platform;
  strategy?: string; // resource-id | accessibility-id | xpath | uiselector | predicate | class-chain
  locator: string;
  quality?: LocatorQuality;
  waitStrategy?: string;
  timeoutMs?: number;
  pollingMs?: number;
  durationMs?: number;
  result?: LocatorResult;
  retryCount?: number;
  elementText?: string;
  bounds?: ElementBounds;
  exceptionType?: string;
  message?: string;
}

export interface ScreenshotEvent extends BaseEvent {
  eventType: 'SCREENSHOT_CAPTURED';
  /** BEFORE_STEP | AFTER_STEP | FAILURE | MANUAL */
  kind?: string;
  /** Path on the machine that runs the automation (framework output). */
  path?: string;
  /** Optional inline payload; server persists it and rewrites `url`. */
  imageBase64?: string;
  /** URL the dashboard can fetch, assigned by the server. */
  url?: string;
  width?: number;
  height?: number;
}

export interface LogEvent extends BaseEvent {
  eventType: 'LOG';
  source: LogSource;
  level: LogLevel;
  message: string;
  logger?: string;
  thread?: string;
}

export interface DeviceInfoEvent extends BaseEvent {
  eventType: 'DEVICE_INFO';
  platform: Platform;
  deviceName?: string;
  udid?: string;
  osVersion?: string;
  environment?: string;
  executionMode?: string;
  appiumPort?: number;
  systemPort?: number;
  chromeDriverPort?: number;
  wdaPort?: number;
  appiumSessionId?: string;
  wdaSessionId?: string;
  xcodeRuntime?: string;
  implicitWaitSec?: number;
  appPackage?: string;
  appActivity?: string;
  bundleId?: string;
}

export interface FailureClassifiedEvent extends BaseEvent {
  eventType: 'FAILURE_CLASSIFIED';
  scenarioId: string;
  stepId?: string;
  failureClassification: FailureClassification;
  exceptionType?: string;
  message?: string;
  possibleCause?: string;
  recommendedFixLayer?: string;
  doNotFixBy?: string;
  failedPage?: string;
  failedLocator?: string;
  appActivity?: string;
  deviceState?: string;
}

export interface PageSourceEvent extends BaseEvent {
  eventType: 'PAGE_SOURCE_CAPTURED';
  /** Inline XML page source (may be large; server persists to disk). */
  source?: string;
  path?: string;
  url?: string;
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

const EVENT_TYPES: ReadonlySet<string> = new Set<EventType>([
  'RUN_STARTED',
  'RUN_FINISHED',
  'SCENARIO_STARTED',
  'SCENARIO_FINISHED',
  'STEP_STARTED',
  'STEP_PASSED',
  'STEP_FAILED',
  'STEP_SKIPPED',
  'LOCATOR_USED',
  'SCREENSHOT_CAPTURED',
  'LOG',
  'DEVICE_INFO',
  'FAILURE_CLASSIFIED',
  'PAGE_SOURCE_CAPTURED',
]);

export function isKnownEventType(value: unknown): value is EventType {
  return typeof value === 'string' && EVENT_TYPES.has(value);
}
