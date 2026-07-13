import { create } from 'zustand';
import type { DeviceStreamStatus } from '../types/device';

/**
 * Live device frame state. `frameSeq` bumps on every WS frame notification;
 * DeviceLiveView re-fetches /api/device/frame with the new seq as cache-buster.
 */
interface DeviceStore {
  frameSeq: number;
  frameSource?: string;
  streamStatus: DeviceStreamStatus;
  lastFrameAt?: string;
  setFrame: (seq: number, source: string, timestamp: string) => void;
  setStreamStatus: (status: DeviceStreamStatus) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  frameSeq: 0,
  streamStatus: { status: 'probing', seq: 0 },

  setFrame: (frameSeq, frameSource, lastFrameAt) =>
    set((s) => ({
      frameSeq,
      frameSource,
      lastFrameAt,
      streamStatus: { ...s.streamStatus, status: 'streaming', source: frameSource, seq: frameSeq },
    })),

  setStreamStatus: (streamStatus) => set({ streamStatus }),
}));
