import type { StepStatus, RunStatus } from '../../types/common';

const LABELS: Record<string, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  PASSED: 'Passed',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
  ABORTED: 'Aborted',
};

export function StatusPill({ status, small }: { status: StepStatus | RunStatus; small?: boolean }) {
  return (
    <span className={`status-pill status-${status.toLowerCase()}${small ? ' status-pill--sm' : ''}`}>
      {status === 'RUNNING' && <span className="pulse-dot" />}
      {LABELS[status] ?? status}
    </span>
  );
}
