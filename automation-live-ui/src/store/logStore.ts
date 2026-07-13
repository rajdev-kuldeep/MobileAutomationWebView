import { create } from 'zustand';
import type { LogEvent, LogLevel, LogSource } from '../types/log';

const MAX_LOGS = 5000;

/**
 * Live log buffer + console filter state. When the stream is paused, incoming
 * logs accumulate in a side buffer and flush on resume, so nothing is lost.
 */
interface LogStore {
  logs: LogEvent[];
  paused: boolean;
  pendingWhilePaused: LogEvent[];
  autoScroll: boolean;
  // filters
  levelFilter: LogLevel | 'ALL';
  sourceFilters: Set<LogSource>;
  search: string;
  regexMode: boolean;
  stepFilter?: string; // stepId — "show logs only for selected step"

  addLog: (log: LogEvent) => void;
  setSnapshot: (logs: LogEvent[]) => void;
  setPaused: (paused: boolean) => void;
  setAutoScroll: (auto: boolean) => void;
  setLevelFilter: (level: LogLevel | 'ALL') => void;
  toggleSource: (source: LogSource) => void;
  clearSourceFilters: () => void;
  setSearch: (search: string) => void;
  setRegexMode: (regex: boolean) => void;
  setStepFilter: (stepId?: string) => void;
  clear: () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  paused: false,
  pendingWhilePaused: [],
  autoScroll: true,
  levelFilter: 'ALL',
  sourceFilters: new Set<LogSource>(),
  search: '',
  regexMode: false,
  stepFilter: undefined,

  addLog: (log) =>
    set((s) =>
      s.paused
        ? { pendingWhilePaused: [...s.pendingWhilePaused, log].slice(-MAX_LOGS) }
        : { logs: [...s.logs, log].slice(-MAX_LOGS) },
    ),

  setSnapshot: (logs) => set({ logs: logs.slice(-MAX_LOGS), pendingWhilePaused: [] }),

  setPaused: (paused) =>
    set((s) =>
      paused
        ? { paused }
        : {
            paused,
            logs: [...s.logs, ...s.pendingWhilePaused].slice(-MAX_LOGS),
            pendingWhilePaused: [],
          },
    ),

  setAutoScroll: (autoScroll) => set({ autoScroll }),
  setLevelFilter: (levelFilter) => set({ levelFilter }),
  toggleSource: (source) =>
    set((s) => {
      const next = new Set(s.sourceFilters);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return { sourceFilters: next };
    }),
  clearSourceFilters: () => set({ sourceFilters: new Set() }),
  setSearch: (search) => set({ search }),
  setRegexMode: (regexMode) => set({ regexMode }),
  setStepFilter: (stepFilter) => set({ stepFilter }),
  clear: () => set({ logs: [], pendingWhilePaused: [] }),
}));
