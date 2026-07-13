import { useMemo } from 'react';
import { useLogStore } from '../store/logStore';
import type { LogEvent } from '../types/log';

/** Applies the console filter state to the live log buffer. */
export function useLogFilters(): { filtered: LogEvent[]; total: number; regexError: boolean } {
  const logs = useLogStore((s) => s.logs);
  const levelFilter = useLogStore((s) => s.levelFilter);
  const sourceFilters = useLogStore((s) => s.sourceFilters);
  const search = useLogStore((s) => s.search);
  const regexMode = useLogStore((s) => s.regexMode);
  const stepFilter = useLogStore((s) => s.stepFilter);

  return useMemo(() => {
    let regex: RegExp | null = null;
    let regexError = false;
    if (regexMode && search) {
      try {
        regex = new RegExp(search, 'i');
      } catch {
        regexError = true;
      }
    }
    const needle = search.toLowerCase();

    const filtered = logs.filter((log) => {
      if (levelFilter !== 'ALL') {
        if (levelFilter === 'ERROR' && log.level !== 'ERROR') return false;
        if (levelFilter === 'WARN' && log.level !== 'WARN' && log.level !== 'ERROR') return false;
        if (levelFilter !== 'ERROR' && levelFilter !== 'WARN' && log.level !== levelFilter)
          return false;
      }
      if (sourceFilters.size > 0 && !sourceFilters.has(log.source)) return false;
      if (stepFilter && log.stepId !== stepFilter) return false;
      if (search) {
        if (regex) return regex.test(log.message);
        if (regexError) return true; // invalid regex: show everything, flag the error
        return log.message.toLowerCase().includes(needle);
      }
      return true;
    });

    return { filtered, total: logs.length, regexError };
  }, [logs, levelFilter, sourceFilters, search, regexMode, stepFilter]);
}
