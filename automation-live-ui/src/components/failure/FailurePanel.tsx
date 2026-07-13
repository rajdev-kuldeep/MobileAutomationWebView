import { ShieldAlert, Lightbulb, Ban, Wrench, Download } from 'lucide-react';
import { useRunStore } from '../../store/runStore';
import { FailureClassificationBadge } from './FailureClassification';
import { ScreenshotViewer } from '../device/ScreenshotViewer';

/**
 * Right panel tab: latest failure with classification, AI-ready hints
 * (possible cause / recommended fix layer / anti-pattern warning), the
 * failure screenshot, previous successful step, and page-source download.
 */
export function FailurePanel() {
  const run = useRunStore((s) => s.run);
  const failure = run?.lastFailure;

  if (!run || !failure) {
    return (
      <div className="panel-empty">
        <ShieldAlert size={22} />
        <p>No failures yet.</p>
        <p className="panel-empty-hint">Failure classification and debugging hints will appear here.</p>
      </div>
    );
  }

  const scenario = run.scenarios[failure.scenarioId];
  const failedStep = failure.stepId ? scenario?.steps[failure.stepId] : undefined;
  const failureShot = failedStep
    ? [...failedStep.screenshots].reverse().find((s) => s.kind === 'FAILURE') ??
      failedStep.screenshots[failedStep.screenshots.length - 1]
    : undefined;

  // Previous successful step in the same scenario, for "last known good".
  let previousPassed;
  if (scenario && failedStep) {
    for (let i = failedStep.index - 1; i >= 0; i -= 1) {
      const candidate = scenario.steps[scenario.stepOrder[i]];
      if (candidate?.status === 'PASSED') {
        previousPassed = candidate;
        break;
      }
    }
  }

  return (
    <div className="failure-panel">
      <FailureClassificationBadge classification={failure.failureClassification} />

      {failedStep && (
        <div className="failure-step">
          <div className="section-label">Failed step</div>
          <div className="failure-step-text">
            <span className="step-keyword">{failedStep.keyword}</span> {failedStep.stepText}
          </div>
        </div>
      )}

      <div className="kv-grid">
        {failure.failedPage && (<><span className="kv-key">Page</span><span className="kv-val">{failure.failedPage}</span></>)}
        {failure.failedLocator && (<><span className="kv-key">Locator</span><span className="kv-val mono">{failure.failedLocator}</span></>)}
        {failure.exceptionType && (<><span className="kv-key">Exception</span><span className="kv-val mono">{failure.exceptionType}</span></>)}
        {failure.appActivity && (<><span className="kv-key">Activity</span><span className="kv-val mono">{failure.appActivity}</span></>)}
        {failure.deviceState && (<><span className="kv-key">Device</span><span className="kv-val">{failure.deviceState}</span></>)}
      </div>

      {failure.message && <div className="failure-message">{failure.message}</div>}

      {failure.possibleCause && (
        <div className="callout callout-info">
          <Lightbulb size={14} />
          <div><strong>Possible cause</strong><br />{failure.possibleCause}</div>
        </div>
      )}
      {failure.recommendedFixLayer && (
        <div className="callout callout-ok">
          <Wrench size={14} />
          <div><strong>Recommended layer to fix</strong><br />{failure.recommendedFixLayer}</div>
        </div>
      )}
      {failure.doNotFixBy && (
        <div className="callout callout-warn">
          <Ban size={14} />
          <div><strong>Do not fix by</strong><br />{failure.doNotFixBy}</div>
        </div>
      )}

      {failureShot?.url && (
        <div className="shot-compare">
          <ScreenshotViewer url={failureShot.url} label="Failure screenshot" highlight />
        </div>
      )}

      {previousPassed && (
        <div className="failure-prev">
          <div className="section-label">Previous successful step</div>
          <div className="failure-step-text">
            <span className="step-keyword">{previousPassed.keyword}</span> {previousPassed.stepText}
          </div>
        </div>
      )}

      <a
        className="chip"
        href={`/api/page-source/latest?runId=${encodeURIComponent(run.runId)}`}
        target="_blank"
        rel="noreferrer"
      >
        <Download size={12} /> Page source snapshot
      </a>
    </div>
  );
}
