import { useEffect, useState } from 'react';
import {
  Smartphone,
  Apple,
  Moon,
  Sun,
  ExternalLink,
  Radio,
  WifiOff,
  Activity,
} from 'lucide-react';
import { useRunStore } from '../../store/runStore';
import { useUiStore } from '../../store/uiStore';
import { StatusPill } from '../common/StatusPill';
import { elapsedSince, formatDuration } from '../common/format';

/**
 * Top bar: run identity, environment/platform badges, live step counters,
 * duration ticker, TestHub link, theme toggle, connection indicator.
 */
export function HeaderBar() {
  const run = useRunStore((s) => s.run);
  const connection = useRunStore((s) => s.connection);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  // Tick every second while the run is live so the duration counts up.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (run?.status !== 'RUNNING') return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [run?.status]);

  const scenario = run?.currentScenarioId ? run.scenarios[run.currentScenarioId] : undefined;
  const duration = formatDuration(elapsedSince(run?.startedAt, run?.finishedAt));

  return (
    <header className="header-bar">
      <div className="header-left">
        <div className="brand">
          <Activity size={18} className="brand-icon" />
          <div>
            <div className="brand-title">Cashi Automation Live View</div>
            <div className="brand-subtitle">
              {run ? `${run.project ?? 'CashiUIAutomation'} · ${run.module ?? 'CashiMobileAutomation'}` : 'waiting for run…'}
            </div>
          </div>
        </div>
        {run && (
          <>
            <div className="header-divider" />
            <div className="header-meta">
              <span className="meta-label">Run</span>
              <span className="meta-value mono">{run.runId}</span>
            </div>
            {scenario?.scenarioName && (
              <div className="header-meta header-scenario" title={scenario.featureName}>
                <span className="meta-label">Scenario</span>
                <span className="meta-value">{scenario.scenarioName}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="header-right">
        {run && (
          <>
            {run.environment && <span className="badge badge-env">{run.environment}</span>}
            {run.platform && (
              <span className="badge badge-platform">
                {run.platform === 'iOS' ? <Apple size={12} /> : <Smartphone size={12} />}
                {run.platform}
              </span>
            )}
            {run.executionMode && <span className="badge badge-mode">{run.executionMode}</span>}
            <div className="header-counters">
              <span className="counter counter-passed" title="Passed steps">✓ {run.counters.passedSteps}</span>
              <span className="counter counter-failed" title="Failed steps">✗ {run.counters.failedSteps}</span>
              <span className="counter counter-skipped" title="Skipped steps">− {run.counters.skippedSteps}</span>
              <span className="counter counter-total" title="Total steps">Σ {run.counters.totalSteps}</span>
            </div>
            <span className="header-duration mono" title="Run duration">{duration}</span>
            <StatusPill status={run.status} />
            {run.testHubUrl && (
              <a className="icon-button" href={run.testHubUrl} target="_blank" rel="noreferrer" title="Open in TestHub">
                <ExternalLink size={15} />
              </a>
            )}
          </>
        )}
        <span
          className={`conn-indicator conn-${connection}`}
          title={connection === 'open' ? 'Live connection active' : `WebSocket ${connection}`}
        >
          {connection === 'open' ? <Radio size={14} /> : <WifiOff size={14} />}
        </span>
        <button
          className="icon-button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
