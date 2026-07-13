import { useEffect, useState } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { useRunStore } from '../store/runStore';
import { apiClient } from '../services/apiClient';

export interface DeviceStreamView {
  /** Image URL to render, or null when nothing is available yet. */
  imageUrl: string | null;
  /** live = real device frames; fallback = latest step screenshot. */
  mode: 'live' | 'fallback' | 'none';
  source?: string;
}

/**
 * Chooses what the Device Live View should render:
 *  1. live frames when the server stream is up (URL keyed by frame seq),
 *  2. otherwise the latest framework step screenshot,
 *  3. otherwise nothing (placeholder shown by the component).
 */
export function useDeviceStream(): DeviceStreamView {
  const frameSeq = useDeviceStore((s) => s.frameSeq);
  const frameSource = useDeviceStore((s) => s.frameSource);
  const streamStatus = useDeviceStore((s) => s.streamStatus);
  const lastScreenshot = useRunStore((s) => s.run?.lastScreenshot);

  // On mount, ask the server whether a stream exists (WS hello also sets this).
  useEffect(() => {
    let cancelled = false;
    void apiClient.deviceCurrent().then((res) => {
      if (res && !cancelled) useDeviceStore.getState().setStreamStatus(res.stream);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [liveHealthy, setLiveHealthy] = useState(true);

  // If frames stop arriving for a while, drop back to screenshots.
  useEffect(() => {
    if (frameSeq === 0) return;
    setLiveHealthy(true);
    const timer = window.setTimeout(() => setLiveHealthy(false), 10000);
    return () => window.clearTimeout(timer);
  }, [frameSeq]);

  const streaming = streamStatus.status === 'streaming' && frameSeq > 0 && liveHealthy;

  if (streaming) {
    return { imageUrl: apiClient.deviceFrameUrl(frameSeq), mode: 'live', source: frameSource };
  }
  if (lastScreenshot?.url) {
    return { imageUrl: lastScreenshot.url, mode: 'fallback' };
  }
  return { imageUrl: null, mode: 'none' };
}
