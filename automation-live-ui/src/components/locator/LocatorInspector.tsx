import { Crosshair, AlertTriangle, Download } from 'lucide-react';
import { useLocatorStore } from '../../store/locatorStore';
import { useRunStore } from '../../store/runStore';
import { LocatorQualityBadge } from './LocatorQualityBadge';
import { LocatorHistory } from './LocatorHistory';
import { formatDuration } from '../common/format';

/**
 * Right panel tab: everything about the element the framework is touching
 * right now — strategy, wait config, result, geometry, quality grade — plus
 * a rolling history and page-source download.
 */
export function LocatorInspector() {
  const current = useLocatorStore((s) => s.current);
  const runId = useRunStore((s) => s.run?.runId);

  if (!current) {
    return (
      <div className="panel-empty">
        <Crosshair size={22} />
        <p>No locator activity yet.</p>
        <p className="panel-empty-hint">
          Element lookups published by the framework wrappers will appear here.
        </p>
      </div>
    );
  }

  const failed = current.result !== undefined && current.result !== 'FOUND';

  return (
    <div className="locator-inspector">
      <div className="section-label">Current locator</div>
      <div className={`locator-card ${failed ? 'locator-card-failed' : ''}`}>
        <div className="locator-card-head">
          <span className="mono locator-main" title={current.locator}>{current.locator}</span>
          <LocatorQualityBadge quality={current.quality} />
        </div>
        <div className="kv-grid">
          {current.page && (<><span className="kv-key">Page</span><span className="kv-val">{current.page}</span></>)}
          {current.method && (<><span className="kv-key">Method</span><span className="kv-val mono">{current.method}()</span></>)}
          {current.action && (<><span className="kv-key">Action</span><span className="kv-val">{current.action}</span></>)}
          {current.strategy && (<><span className="kv-key">Strategy</span><span className="kv-val mono">{current.strategy}</span></>)}
          {current.platform && (<><span className="kv-key">Platform</span><span className="kv-val">{current.platform}</span></>)}
          {current.waitStrategy && (<><span className="kv-key">Wait</span><span className="kv-val">{current.waitStrategy}</span></>)}
          {current.timeoutMs !== undefined && (<><span className="kv-key">Timeout</span><span className="kv-val mono">{formatDuration(current.timeoutMs)}</span></>)}
          {current.pollingMs !== undefined && (<><span className="kv-key">Polling</span><span className="kv-val mono">{current.pollingMs}ms</span></>)}
          {current.result && (
            <>
              <span className="kv-key">Result</span>
              <span className={`kv-val ${failed ? 'text-failed' : 'text-passed'}`}>{current.result}</span>
            </>
          )}
          {current.durationMs !== undefined && (<><span className="kv-key">Duration</span><span className="kv-val mono">{formatDuration(current.durationMs)}</span></>)}
          {current.retryCount !== undefined && current.retryCount > 0 && (
            <><span className="kv-key">Retries</span><span className="kv-val mono">{current.retryCount}</span></>
          )}
          {current.elementText !== undefined && (<><span className="kv-key">Text</span><span className="kv-val">{current.elementText}</span></>)}
          {current.bounds && (
            <>
              <span className="kv-key">Coords</span>
              <span className="kv-val mono">x={current.bounds.x}, y={current.bounds.y}</span>
              <span className="kv-key">Size</span>
              <span className="kv-val mono">{current.bounds.width}×{current.bounds.height}</span>
            </>
          )}
        </div>
        {failed && current.message && <div className="locator-error">{current.message}</div>}
      </div>

      {current.quality === 'BAD' && (
        <div className="callout callout-warn">
          <AlertTriangle size={14} />
          This locator is brittle. Prefer resource-id or accessibility id.
        </div>
      )}
      {current.quality === 'RISKY' && (
        <div className="callout callout-warn">
          <AlertTriangle size={14} />
          Partial XPath may break on layout changes. Prefer resource-id or accessibility id.
        </div>
      )}

      <LocatorHistory limit={10} />

      {runId && (
        <a className="chip" href={`/api/page-source/latest?runId=${encodeURIComponent(runId)}`} target="_blank" rel="noreferrer">
          <Download size={12} /> Latest page source
        </a>
      )}
    </div>
  );
}
