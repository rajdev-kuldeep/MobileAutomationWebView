import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { usePanelResize } from '../../hooks/usePanelResize';
import { HeaderBar } from './HeaderBar';
import { SidePanel } from './SidePanel';
import { BottomConsole } from './BottomConsole';
import { ScenarioTimeline } from '../timeline/ScenarioTimeline';
import { StepDetails } from '../timeline/StepDetails';
import { DeviceLiveView } from '../device/DeviceLiveView';

/**
 * Overall layout:
 *   ┌ HeaderBar ─────────────────────────────────────────────┐
 *   ├ Timeline │ Device Live View (+StepDetails) │ SidePanel ┤
 *   ├ BottomConsole ─────────────────────────────────────────┤
 * Panels resize via drag dividers and collapse via toggles.
 */
export function AppShell() {
  const ui = useUiStore();

  const onLeftResize = usePanelResize('x', () => useUiStore.getState().leftPanelWidth, ui.setLeftPanelWidth);
  const onRightResize = usePanelResize('x', () => useUiStore.getState().rightPanelWidth, ui.setRightPanelWidth, true);
  const onConsoleResize = usePanelResize('y', () => useUiStore.getState().consoleHeight, ui.setConsoleHeight, true);

  return (
    <div className="app-shell">
      <HeaderBar />

      <div className="app-main">
        {!ui.leftCollapsed && (
          <>
            <aside className="left-panel" style={{ width: ui.leftPanelWidth }}>
              <ScenarioTimeline />
            </aside>
            <div className="divider divider-x" onMouseDown={onLeftResize} />
          </>
        )}

        <main className="center-panel">
          <DeviceLiveView />
          <StepDetails />
        </main>

        {!ui.rightCollapsed && (
          <>
            <div className="divider divider-x" onMouseDown={onRightResize} />
            <aside className="right-panel" style={{ width: ui.rightPanelWidth }}>
              <SidePanel />
            </aside>
          </>
        )}
      </div>

      {!ui.consoleCollapsed && (
        <>
          <div className="divider divider-y" onMouseDown={onConsoleResize} />
          <footer className="console-dock" style={{ height: ui.consoleHeight }}>
            <BottomConsole />
          </footer>
        </>
      )}

      <div className="collapse-bar">
        <button className="icon-button" onClick={ui.toggleLeft} title="Toggle timeline panel">
          {ui.leftCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <button className="icon-button" onClick={ui.toggleConsole} title="Toggle console">
          {ui.consoleCollapsed ? <PanelBottomOpen size={14} /> : <PanelBottomClose size={14} />}
        </button>
        <button className="icon-button" onClick={ui.toggleRight} title="Toggle inspector panel">
          {ui.rightCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        </button>
      </div>
    </div>
  );
}
