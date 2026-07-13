import { useEffect, useRef } from 'react';
import { FileText, Crosshair } from 'lucide-react';
import { useRunStore } from '../../store/runStore';
import { useUiStore } from '../../store/uiStore';
import { StepItem } from './StepItem';
import { StatusPill } from '../common/StatusPill';
import type { StepState } from '../../types/step';

/**
 * Left panel: feature → scenario → step tree with live status.
 * Auto-scrolls to the running step while follow mode is on; clicking a step
 * selects it for the inspector panels and disables follow.
 */
export function ScenarioTimeline() {
  const run = useRunStore((s) => s.run);
  const selectedStepId = useUiStore((s) => s.selectedStepId);
  const followRunning = useUiStore((s) => s.followRunning);
  const selectStep = useUiStore((s) => s.selectStep);
  const setFollowRunning = useUiStore((s) => s.setFollowRunning);
  const listRef = useRef<HTMLDivElement>(null);

  const currentStepId = run?.currentStepId;

  useEffect(() => {
    if (!followRunning || !currentStepId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-step-id="${CSS.escape(currentStepId)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [followRunning, currentStepId]);

  const onSelect = (step: StepState) => selectStep(step.scenarioId, step.stepId);

  if (!run || run.scenarioOrder.length === 0) {
    return (
      <div className="panel-empty">
        <FileText size={22} />
        <p>No scenario yet.</p>
        <p className="panel-empty-hint">
          Start a test run with <code>-DliveView.enabled=true</code> and the timeline will populate
          here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="panel-toolbar">
        <span className="panel-title">Timeline</span>
        <button
          className={`chip ${followRunning ? 'chip-active' : ''}`}
          onClick={() => setFollowRunning(!followRunning)}
          title="Auto-follow the running step"
        >
          <Crosshair size={12} /> Follow
        </button>
      </div>
      <div className="timeline-list" ref={listRef}>
        {run.scenarioOrder.map((scenarioId) => {
          const scenario = run.scenarios[scenarioId];
          if (!scenario) return null;
          return (
            <section key={scenarioId} className="scenario-block">
              {scenario.featureName && (
                <div className="feature-name" title={scenario.featureName}>
                  {scenario.featureName}
                </div>
              )}
              <div className="scenario-header">
                <span className="scenario-name">{scenario.scenarioName ?? scenarioId}</span>
                <StatusPill status={scenario.status} small />
              </div>
              {scenario.tags.length > 0 && (
                <div className="scenario-tags">
                  {scenario.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="step-list">
                {scenario.stepOrder.map((stepId) => {
                  const step = scenario.steps[stepId];
                  if (!step) return null;
                  return (
                    <StepItem
                      key={stepId}
                      step={step}
                      selected={selectedStepId === stepId}
                      isCurrent={currentStepId === stepId}
                      onSelect={onSelect}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
