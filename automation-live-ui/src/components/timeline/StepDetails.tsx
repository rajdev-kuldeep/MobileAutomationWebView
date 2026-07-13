import { X } from 'lucide-react';
import { useSelectedStep } from '../../hooks/useSelectedStep';
import { useUiStore } from '../../store/uiStore';
import { useLogStore } from '../../store/logStore';
import { formatDuration, formatTime } from '../common/format';
import { StatusPill } from '../common/StatusPill';
import { LocatorQualityBadge } from '../locator/LocatorQualityBadge';
import { ScreenshotViewer } from '../device/ScreenshotViewer';

/**
 * Detail card for the selected (non-live) step: before/after screenshots,
 * locators used, page/flow/method, failure info, and a "logs for this step"
 * shortcut that filters the console.
 */
export function StepDetails() {
  const { step, isLive } = useSelectedStep();
  const selectStep = useUiStore((s) => s.selectStep);
  const setStepFilter = useLogStore((s) => s.setStepFilter);
  const stepFilter = useLogStore((s) => s.stepFilter);

  if (!step || isLive) return null;

  const before = step.screenshots.find((s) => s.kind === 'BEFORE_STEP');
  const after = [...step.screenshots].reverse().find((s) => s.kind === 'AFTER_STEP');
  const failure = [...step.screenshots].reverse().find((s) => s.kind === 'FAILURE');

  return (
    <div className="step-details">
      <div className="step-details-header">
        <div>
          <span className="step-keyword">{step.keyword}</span> {step.stepText}
        </div>
        <div className="step-details-actions">
          <StatusPill status={step.status} small />
          <button className="icon-button" onClick={() => selectStep(undefined, undefined)} title="Back to live view">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="kv-grid">
        <span className="kv-key">Started</span><span className="kv-val mono">{formatTime(step.startedAt)}</span>
        <span className="kv-key">Finished</span><span className="kv-val mono">{formatTime(step.finishedAt)}</span>
        <span className="kv-key">Duration</span><span className="kv-val mono">{formatDuration(step.durationMs)}</span>
        {step.page && (<><span className="kv-key">Page</span><span className="kv-val">{step.page}</span></>)}
        {step.flow && (<><span className="kv-key">Flow</span><span className="kv-val">{step.flow}</span></>)}
        {step.method && (<><span className="kv-key">Method</span><span className="kv-val mono">{step.method}()</span></>)}
      </div>

      {(before || after || failure) && (
        <div className="shot-compare">
          {before?.url && <ScreenshotViewer url={before.url} label="Before step" />}
          {after?.url && <ScreenshotViewer url={after.url} label="After step" />}
          {failure?.url && <ScreenshotViewer url={failure.url} label="Failure" highlight />}
        </div>
      )}

      {step.locators.length > 0 && (
        <div className="step-locators">
          <div className="section-label">Locators used ({step.locators.length})</div>
          {step.locators.map((loc, i) => (
            <div key={i} className={`locator-row ${loc.result !== 'FOUND' ? 'locator-row-failed' : ''}`}>
              <LocatorQualityBadge quality={loc.quality} />
              <span className="mono locator-value" title={loc.locator}>{loc.locator}</span>
              <span className="locator-meta">{loc.action} · {formatDuration(loc.durationMs)}</span>
            </div>
          ))}
        </div>
      )}

      {step.status === 'FAILED' && (
        <div className="step-failure">
          <div className="section-label">Failure</div>
          {step.exceptionType && <div className="mono failure-exception">{step.exceptionType}</div>}
          {step.message && <div className="failure-message">{step.message}</div>}
          {step.stackTrace && <pre className="failure-stack">{step.stackTrace}</pre>}
        </div>
      )}

      <button
        className={`chip ${stepFilter === step.stepId ? 'chip-active' : ''}`}
        onClick={() => setStepFilter(stepFilter === step.stepId ? undefined : step.stepId)}
      >
        {stepFilter === step.stepId ? 'Showing logs for this step' : 'Show logs for this step'}
      </button>
    </div>
  );
}
