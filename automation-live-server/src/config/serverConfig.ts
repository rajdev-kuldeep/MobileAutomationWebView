import path from 'node:path';
import os from 'node:os';

/**
 * Server configuration, overridable through environment variables so the
 * dashboard can run against any local framework checkout without code edits.
 */
export interface ServerConfig {
  port: number;
  host: string;
  /** Directory where run event journals + persisted screenshots are written. */
  dataDir: string;
  /**
   * Base directory used to resolve relative screenshot paths published by the
   * Java framework (framework writes screenshots, server serves the files).
   */
  screenshotBaseDir: string;
  /** Device screen polling. */
  deviceStream: {
    enabled: boolean;
    intervalMs: number;
    /** preferred source order: adb | simctl (appium handled by Java bridge) */
    sources: string[];
    androidUdid?: string;
    iosUdid?: string;
  };
  /** Max events kept in memory per run (journal on disk keeps everything). */
  maxEventsInMemory: number;
  maxLogEventsInMemory: number;
  /** Serve the built frontend from this dir when it exists (single-port mode). */
  uiDistDir: string;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

export const serverConfig: ServerConfig = {
  port: envInt('LIVEVIEW_PORT', 4545),
  host: process.env.LIVEVIEW_HOST ?? '0.0.0.0',
  dataDir: process.env.LIVEVIEW_DATA_DIR ?? path.join(os.tmpdir(), 'cashi-live-view'),
  screenshotBaseDir: process.env.LIVEVIEW_SCREENSHOT_BASE_DIR ?? process.cwd(),
  deviceStream: {
    enabled: envBool('LIVEVIEW_DEVICE_STREAM', true),
    intervalMs: Math.max(300, envInt('LIVEVIEW_DEVICE_STREAM_INTERVAL_MS', 800)),
    sources: (process.env.LIVEVIEW_DEVICE_STREAM_SOURCES ?? 'adb,simctl')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    androidUdid: process.env.LIVEVIEW_ANDROID_UDID,
    iosUdid: process.env.LIVEVIEW_IOS_UDID,
  },
  maxEventsInMemory: envInt('LIVEVIEW_MAX_EVENTS', 20000),
  maxLogEventsInMemory: envInt('LIVEVIEW_MAX_LOG_EVENTS', 10000),
  uiDistDir:
    process.env.LIVEVIEW_UI_DIST ??
    path.resolve(import.meta.dirname, '../../../automation-live-ui/dist'),
};
