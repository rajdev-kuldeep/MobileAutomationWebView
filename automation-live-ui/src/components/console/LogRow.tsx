import { memo } from 'react';
import { formatTime } from '../common/format';
import type { LogEvent } from '../../types/log';

/** One console line: Timestamp | Source | Level | Step | Message. */
export const LogRow = memo(function LogRow({ log }: { log: LogEvent }) {
  return (
    <div className={`log-row log-${log.level.toLowerCase()}`}>
      <span className="log-ts mono">{formatTime(log.timestamp)}</span>
      <span className={`log-source log-source-${log.source.toLowerCase()}`}>{log.source}</span>
      <span className="log-level mono">{log.level}</span>
      <span className="log-step mono" title={log.scenarioId}>{log.stepId ?? ''}</span>
      <span className="log-message">{log.message}</span>
    </div>
  );
});
