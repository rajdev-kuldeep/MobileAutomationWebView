import { Crosshair, Smartphone, ShieldAlert } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useRunStore } from '../../store/runStore';
import { LocatorInspector } from '../locator/LocatorInspector';
import { DeviceSessionPanel } from '../session/DeviceSessionPanel';
import { FailurePanel } from '../failure/FailurePanel';
import type { RightPanelTab } from '../../store/uiStore';

const TABS: Array<{ id: RightPanelTab; label: string; icon: typeof Crosshair }> = [
  { id: 'locator', label: 'Locator', icon: Crosshair },
  { id: 'session', label: 'Session', icon: Smartphone },
  { id: 'failure', label: 'Failure', icon: ShieldAlert },
];

/** Right panel: tabbed Locator Inspector / Device Session / Failure Debug. */
export function SidePanel() {
  const rightTab = useUiStore((s) => s.rightTab);
  const setRightTab = useUiStore((s) => s.setRightTab);
  const hasFailure = useRunStore((s) => Boolean(s.run?.lastFailure));

  return (
    <div className="side-panel">
      <div className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tab ${rightTab === id ? 'tab-active' : ''} ${id === 'failure' && hasFailure ? 'tab-alert' : ''}`}
            onClick={() => setRightTab(id)}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <div className="side-panel-body">
        {rightTab === 'locator' && <LocatorInspector />}
        {rightTab === 'session' && <DeviceSessionPanel />}
        {rightTab === 'failure' && <FailurePanel />}
      </div>
    </div>
  );
}
