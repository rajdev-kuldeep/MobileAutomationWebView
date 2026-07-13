import { create } from 'zustand';
import type { LocatorEvent } from '../types/locator';

const HISTORY_LIMIT = 50;

/** Feed for the Locator Inspector: current locator + rolling history. */
interface LocatorStore {
  current: LocatorEvent | null;
  history: LocatorEvent[];
  addLocator: (event: LocatorEvent) => void;
  setSnapshot: (history: LocatorEvent[]) => void;
  clear: () => void;
}

export const useLocatorStore = create<LocatorStore>((set) => ({
  current: null,
  history: [],

  addLocator: (event) =>
    set((s) => ({
      current: event,
      history: [...s.history, event].slice(-HISTORY_LIMIT),
    })),

  setSnapshot: (history) =>
    set({
      history: history.slice(-HISTORY_LIMIT),
      current: history.length > 0 ? history[history.length - 1] : null,
    }),

  clear: () => set({ current: null, history: [] }),
}));
