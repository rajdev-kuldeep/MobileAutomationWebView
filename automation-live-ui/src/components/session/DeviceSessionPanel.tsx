import { Smartphone } from 'lucide-react';
import { useRunStore } from '../../store/runStore';

/** Right panel tab: device capabilities and Appium/WDA session details. */
export function DeviceSessionPanel() {
  const run = useRunStore((s) => s.run);
  const info = run?.deviceInfo;

  if (!info) {
    return (
      <div className="panel-empty">
        <Smartphone size={22} />
        <p>No device info yet.</p>
        <p className="panel-empty-hint">Published by the framework once the driver session is created.</p>
      </div>
    );
  }

  const rows: Array<[string, string | number | undefined]> = [
    ['Platform', info.platform],
    ['Device', info.deviceName],
    ['UDID', info.udid],
    ['OS Version', info.osVersion],
    ['Environment', info.environment ?? run?.environment],
    ['Execution Mode', info.executionMode ?? run?.executionMode],
    ['Appium Port', info.appiumPort],
    ['System Port', info.systemPort],
    ['ChromeDriver Port', info.chromeDriverPort],
    ['WDA Port', info.wdaPort],
    ['Appium Session ID', info.appiumSessionId],
    ['WDA Session ID', info.wdaSessionId],
    ['Xcode Runtime', info.xcodeRuntime],
    ['Implicit Wait', info.implicitWaitSec !== undefined ? `${info.implicitWaitSec}s` : undefined],
    ['App Package', info.appPackage],
    ['App Activity', info.appActivity],
    ['Bundle ID', info.bundleId],
  ];

  return (
    <div className="session-panel">
      <div className="section-label">Device &amp; session</div>
      <div className="kv-grid">
        {rows
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([key, value]) => (
            <span key={key} className="kv-pair">
              <span className="kv-key">{key}</span>
              <span className="kv-val mono">{String(value)}</span>
            </span>
          ))}
      </div>
    </div>
  );
}
