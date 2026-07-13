import { CheckCircle2, XCircle, CircleDashed, Loader2, MinusCircle } from 'lucide-react';
import type { StepStatus } from '../../types/common';

export function StepStatusIcon({ status, size = 15 }: { status: StepStatus; size?: number }) {
  switch (status) {
    case 'PASSED':
      return <CheckCircle2 size={size} className="icon-passed" />;
    case 'FAILED':
      return <XCircle size={size} className="icon-failed" />;
    case 'RUNNING':
      return <Loader2 size={size} className="icon-running spin" />;
    case 'SKIPPED':
      return <MinusCircle size={size} className="icon-skipped" />;
    default:
      return <CircleDashed size={size} className="icon-pending" />;
  }
}
