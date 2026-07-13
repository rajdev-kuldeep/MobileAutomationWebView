import { LogConsole } from '../console/LogConsole';

/** Bottom dock hosting the log console (kept thin on purpose). */
export function BottomConsole() {
  return (
    <div className="bottom-console">
      <LogConsole />
    </div>
  );
}
