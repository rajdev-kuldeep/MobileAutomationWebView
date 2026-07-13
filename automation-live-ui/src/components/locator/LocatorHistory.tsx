import { useLocatorStore } from '../../store/locatorStore';
import { LocatorQualityBadge } from './LocatorQualityBadge';
import { formatDuration, formatTime } from '../common/format';

/** Last N locators, newest first; failed lookups are highlighted. */
export function LocatorHistory({ limit = 10 }: { limit?: number }) {
  const history = useLocatorStore((s) => s.history);
  const recent = history.slice(-limit).reverse();

  if (recent.length === 0) return null;

  return (
    <div className="locator-history">
      <div className="section-label">Recent locators</div>
      {recent.map((loc, i) => (
        <div
          key={`${loc.seq ?? i}`}
          className={`locator-row ${loc.result && loc.result !== 'FOUND' ? 'locator-row-failed' : ''}`}
          title={`${loc.page ?? ''}.${loc.method ?? ''} — ${loc.result ?? ''} at ${formatTime(loc.timestamp)}`}
        >
          <LocatorQualityBadge quality={loc.quality} />
          <span className="mono locator-value">{loc.locator}</span>
          <span className="locator-meta">
            {loc.result === 'FOUND' ? formatDuration(loc.durationMs) : (loc.result ?? '')}
          </span>
        </div>
      ))}
    </div>
  );
}
