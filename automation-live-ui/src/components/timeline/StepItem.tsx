import { memo } from 'react';
import { StepStatusIcon } from '../common/StepStatusIcon';
import { formatDuration } from '../common/format';
import type { StepState } from '../../types/step';

interface Props {
  step: StepState;
  selected: boolean;
  isCurrent: boolean;
  onSelect: (step: StepState) => void;
}

export const StepItem = memo(function StepItem({ step, selected, isCurrent, onSelect }: Props) {
  return (
    <button
      className={[
        'step-item',
        `step-${step.status.toLowerCase()}`,
        selected ? 'step-selected' : '',
        isCurrent ? 'step-current' : '',
      ].join(' ')}
      onClick={() => onSelect(step)}
      data-step-id={step.stepId}
    >
      <span className="step-icon">
        <StepStatusIcon status={step.status} />
      </span>
      <span className="step-body">
        <span className="step-text">
          <span className="step-keyword">{step.keyword ?? ''}</span> {step.stepText ?? step.stepId}
        </span>
        {step.status === 'FAILED' && step.message && (
          <span className="step-error" title={step.message}>{step.message}</span>
        )}
      </span>
      <span className="step-duration mono">{formatDuration(step.durationMs)}</span>
    </button>
  );
});
