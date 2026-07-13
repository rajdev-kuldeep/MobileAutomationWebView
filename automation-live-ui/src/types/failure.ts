import type { BaseEvent } from './common';

export type FailureClassification =
  | 'APP_ISSUE'
  | 'AUTOMATION_ISSUE'
  | 'TEST_DATA_ISSUE'
  | 'ENVIRONMENT_ISSUE'
  | 'API_DEPENDENCY_ISSUE'
  | 'DEVICE_SESSION_ISSUE'
  | 'FRAMEWORK_ISSUE'
  | 'UNKNOWN_REQUIRES_INVESTIGATION';

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
