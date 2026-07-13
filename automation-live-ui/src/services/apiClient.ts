/** Thin REST client. All paths are same-origin; Vite proxies them in dev. */

import type { RunSession } from '../types/run';
import type { LogEvent } from '../types/log';
import type { DeviceInfoEvent, DeviceStreamStatus } from '../types/device';

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const apiClient = {
  health: () => getJson<{ status: string; currentRunId: string | null }>('/health'),
  currentRun: () => getJson<RunSession>('/api/runs/current'),
  runEvents: (runId: string) =>
    getJson<{ runId: string; events: unknown[] }>(`/api/runs/${encodeURIComponent(runId)}/events`),
  logs: (params: Record<string, string>) =>
    getJson<{ count: number; logs: LogEvent[] }>(`/api/logs?${new URLSearchParams(params)}`),
  deviceCurrent: () =>
    getJson<{ deviceInfo: DeviceInfoEvent | null; stream: DeviceStreamStatus }>(
      '/api/device/current',
    ),
  /** Live frame URL; seq acts as cache-buster. */
  deviceFrameUrl: (seq: number) => `/api/device/frame?seq=${seq}`,
};
