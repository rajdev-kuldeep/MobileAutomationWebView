import { useEffect, useRef } from 'react';
import { useLogFilters } from '../../hooks/useLogFilters';
import { useLogStore } from '../../store/logStore';
import { LogFilterBar } from './LogFilterBar';
import { LogRow } from './LogRow';

const RENDER_CAP = 1500; // keep the DOM light; the buffer itself holds more

/** Bottom panel: filterable live log console with auto-scroll. */
export function LogConsole() {
  const { filtered, total, regexError } = useLogFilters();
  const autoScroll = useLogStore((s) => s.autoScroll);
  const paused = useLogStore((s) => s.paused);
  const pendingCount = useLogStore((s) => s.pendingWhilePaused.length);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = filtered.length > RENDER_CAP ? filtered.slice(-RENDER_CAP) : filtered;

  useEffect(() => {
    if (!autoScroll || paused || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [visible.length, autoScroll, paused]);

  return (
    <div className="log-console">
      <LogFilterBar filtered={filtered} />
      {regexError && <div className="callout callout-warn console-callout">Invalid regular expression — showing unfiltered logs.</div>}
      <div className="log-list" ref={listRef}>
        {visible.length === 0 ? (
          <div className="log-empty">No log lines match the current filters.</div>
        ) : (
          visible.map((log, i) => <LogRow key={log.seq ?? i} log={log} />)
        )}
      </div>
      <div className="log-statusline">
        <span>{filtered.length} shown / {total} buffered</span>
        {paused && <span className="text-warn">stream paused ({pendingCount} pending)</span>}
      </div>
    </div>
  );
}
