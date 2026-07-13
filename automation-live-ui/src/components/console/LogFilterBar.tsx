import { Pause, Play, ArrowDownToLine, Copy, Download, Trash2, Regex, X } from 'lucide-react';
import { useLogStore } from '../../store/logStore';
import { LOG_SOURCES, LOG_LEVELS } from '../../types/log';
import type { LogEvent } from '../../types/log';

/**
 * Console controls: level select, source chips, text/regex search, pause,
 * auto-scroll, copy/export/clear, active step filter indicator.
 */
export function LogFilterBar({ filtered }: { filtered: LogEvent[] }) {
  const s = useLogStore();

  const copyVisible = () => {
    const text = filtered
      .map((l) => `${l.timestamp} | ${l.source} | ${l.level} | ${l.stepId ?? ''} | ${l.message}`)
      .join('\n');
    void navigator.clipboard.writeText(text);
  };

  const exportVisible = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liveview-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="log-filter-bar">
      <select
        className="select"
        value={s.levelFilter}
        onChange={(e) => s.setLevelFilter(e.target.value as never)}
        title="Minimum level"
      >
        <option value="ALL">All levels</option>
        {LOG_LEVELS.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <div className="source-chips">
        {LOG_SOURCES.map((source) => (
          <button
            key={source}
            className={`chip chip-xs ${s.sourceFilters.has(source) ? 'chip-active' : ''}`}
            onClick={() => s.toggleSource(source)}
          >
            {source}
          </button>
        ))}
        {s.sourceFilters.size > 0 && (
          <button className="chip chip-xs" onClick={s.clearSourceFilters} title="Clear source filters">
            <X size={11} />
          </button>
        )}
      </div>

      <div className="log-search">
        <input
          className="input"
          placeholder={s.regexMode ? 'regex filter…' : 'search logs…'}
          value={s.search}
          onChange={(e) => s.setSearch(e.target.value)}
        />
        <button
          className={`icon-button ${s.regexMode ? 'icon-button-active' : ''}`}
          onClick={() => s.setRegexMode(!s.regexMode)}
          title="Regex mode"
        >
          <Regex size={13} />
        </button>
      </div>

      {s.stepFilter && (
        <button className="chip chip-active chip-xs" onClick={() => s.setStepFilter(undefined)} title="Clear step filter">
          step: {s.stepFilter} <X size={11} />
        </button>
      )}

      <div className="toolbar-actions">
        <button className={`icon-button ${s.paused ? 'icon-button-active' : ''}`} onClick={() => s.setPaused(!s.paused)} title={s.paused ? 'Resume stream' : 'Pause stream'}>
          {s.paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <button className={`icon-button ${s.autoScroll ? 'icon-button-active' : ''}`} onClick={() => s.setAutoScroll(!s.autoScroll)} title="Auto-scroll">
          <ArrowDownToLine size={13} />
        </button>
        <button className="icon-button" onClick={copyVisible} title="Copy visible logs"><Copy size={13} /></button>
        <button className="icon-button" onClick={exportVisible} title="Export visible logs as JSON"><Download size={13} /></button>
        <button className="icon-button" onClick={s.clear} title="Clear console"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
