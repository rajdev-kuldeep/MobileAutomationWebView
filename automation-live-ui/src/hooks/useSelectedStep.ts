import { useRunStore } from '../store/runStore';
import { useUiStore } from '../store/uiStore';
import type { StepState } from '../types/step';
import type { ScenarioState } from '../types/run';

export interface SelectedStep {
  step: StepState | null;
  scenario: ScenarioState | null;
  /** True when showing the live running step (follow mode). */
  isLive: boolean;
}

/**
 * Resolves which step the inspector panels should describe:
 * an explicitly selected step, or (in follow mode) the currently running /
 * most recently finished step.
 */
export function useSelectedStep(): SelectedStep {
  const run = useRunStore((s) => s.run);
  const selectedStepId = useUiStore((s) => s.selectedStepId);
  const selectedScenarioId = useUiStore((s) => s.selectedScenarioId);
  const followRunning = useUiStore((s) => s.followRunning);

  if (!run) return { step: null, scenario: null, isLive: false };

  if (!followRunning && selectedStepId && selectedScenarioId) {
    const scenario = run.scenarios[selectedScenarioId] ?? null;
    return { step: scenario?.steps[selectedStepId] ?? null, scenario, isLive: false };
  }

  // Follow mode: prefer the running step, else the last finished step.
  const scenarioId = run.currentScenarioId ?? run.scenarioOrder[run.scenarioOrder.length - 1];
  const scenario = scenarioId ? (run.scenarios[scenarioId] ?? null) : null;
  if (!scenario) return { step: null, scenario: null, isLive: true };

  const stepId =
    run.currentStepId && scenario.steps[run.currentStepId]
      ? run.currentStepId
      : scenario.stepOrder[scenario.stepOrder.length - 1];
  return { step: stepId ? (scenario.steps[stepId] ?? null) : null, scenario, isLive: true };
}
