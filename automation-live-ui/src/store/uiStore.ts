import { create } from 'zustand';

export type RightPanelTab = 'locator' | 'session' | 'failure';
export type Theme = 'dark' | 'light';

/**
 * Pure presentation state: selection, follow mode, panel sizes, theme,
 * device-view transforms. Nothing here touches run data.
 */
interface UiStore {
  theme: Theme;
  selectedStepId?: string;
  selectedScenarioId?: string;
  /** Auto-follow the currently running step; disabled when a user selects a past step. */
  followRunning: boolean;
  pinnedStepId?: string;
  rightTab: RightPanelTab;
  leftPanelWidth: number;
  rightPanelWidth: number;
  consoleHeight: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  consoleCollapsed: boolean;
  deviceZoom: number; // 0 = fit-to-screen
  deviceRotation: 0 | 90 | 180 | 270;
  deviceFrameVisible: boolean;
  overlayVisible: boolean;

  setTheme: (theme: Theme) => void;
  selectStep: (scenarioId?: string, stepId?: string) => void;
  setFollowRunning: (follow: boolean) => void;
  pinStep: (stepId?: string) => void;
  setRightTab: (tab: RightPanelTab) => void;
  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  setConsoleHeight: (h: number) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  toggleConsole: () => void;
  setDeviceZoom: (zoom: number) => void;
  rotateDevice: () => void;
  toggleDeviceFrame: () => void;
  toggleOverlay: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  theme: 'dark',
  followRunning: true,
  rightTab: 'locator',
  leftPanelWidth: 320,
  rightPanelWidth: 340,
  consoleHeight: 230,
  leftCollapsed: false,
  rightCollapsed: false,
  consoleCollapsed: false,
  deviceZoom: 0,
  deviceRotation: 0,
  deviceFrameVisible: true,
  overlayVisible: true,

  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
  selectStep: (selectedScenarioId, selectedStepId) =>
    set({ selectedScenarioId, selectedStepId, followRunning: selectedStepId === undefined }),
  setFollowRunning: (followRunning) =>
    set(followRunning ? { followRunning, selectedStepId: undefined } : { followRunning }),
  pinStep: (pinnedStepId) => set({ pinnedStepId }),
  setRightTab: (rightTab) => set({ rightTab }),
  setLeftPanelWidth: (leftPanelWidth) =>
    set({ leftPanelWidth: clamp(leftPanelWidth, 220, 560) }),
  setRightPanelWidth: (rightPanelWidth) =>
    set({ rightPanelWidth: clamp(rightPanelWidth, 260, 620) }),
  setConsoleHeight: (consoleHeight) => set({ consoleHeight: clamp(consoleHeight, 120, 500) }),
  toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  toggleConsole: () => set((s) => ({ consoleCollapsed: !s.consoleCollapsed })),
  setDeviceZoom: (deviceZoom) => set({ deviceZoom: clamp(deviceZoom, 0, 4) }),
  rotateDevice: () =>
    set((s) => ({ deviceRotation: ((s.deviceRotation + 90) % 360) as 0 | 90 | 180 | 270 })),
  toggleDeviceFrame: () => set((s) => ({ deviceFrameVisible: !s.deviceFrameVisible })),
  toggleOverlay: () => set((s) => ({ overlayVisible: !s.overlayVisible })),
}));

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
