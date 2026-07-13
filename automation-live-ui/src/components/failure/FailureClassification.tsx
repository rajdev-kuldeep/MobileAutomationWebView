import type { FailureClassification as Classification } from '../../types/failure';

const LABELS: Record<Classification, string> = {
  APP_ISSUE: 'App Issue',
  AUTOMATION_ISSUE: 'Automation Issue',
  TEST_DATA_ISSUE: 'Test Data Issue',
  ENVIRONMENT_ISSUE: 'Environment Issue',
  API_DEPENDENCY_ISSUE: 'API Dependency Issue',
  DEVICE_SESSION_ISSUE: 'Device Session Issue',
  FRAMEWORK_ISSUE: 'Framework Issue',
  UNKNOWN_REQUIRES_INVESTIGATION: 'Unknown — Requires Investigation',
};

export function FailureClassificationBadge({ classification }: { classification: Classification }) {
  return (
    <span className={`classification-badge classification-${classification.toLowerCase()}`}>
      {LABELS[classification]}
    </span>
  );
}
