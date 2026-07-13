import { createLogger } from '../utils/logger.js';
import { eventBroadcaster } from '../websocket/eventBroadcaster.js';
import { AdbScreenshotAdapter } from '../adapters/AdbScreenshotAdapter.js';
import { IosSimulatorScreenshotAdapter } from '../adapters/IosSimulatorScreenshotAdapter.js';
import type { DeviceFrame, ScreenshotSourceAdapter } from '../adapters/ScreenshotSourceAdapter.js';
import type { ServerConfig } from '../config/serverConfig.js';

const log = createLogger('DeviceStreamService');

export type StreamStatus = 'streaming' | 'unavailable' | 'disabled' | 'probing';

/**
 * Polls the active device for screen frames and notifies WebSocket clients.
 *
 * Design constraints honored here:
 *  - never blocks or affects the automation run (fully out-of-band),
 *  - polls only while browser clients are connected (no wasted adb calls),
 *  - degrades gracefully: when no adapter is available the dashboard falls
 *    back to the latest step screenshot published by the framework.
 */
export class DeviceStreamService {
  private adapters: ScreenshotSourceAdapter[] = [];
  private active?: ScreenshotSourceAdapter;
  private latest?: DeviceFrame;
  private seq = 0;
  private timer?: NodeJS.Timeout;
  private clientCount = 0;
  private consecutiveFailures = 0;
  private status: StreamStatus;

  constructor(private readonly config: ServerConfig['deviceStream']) {
    this.status = config.enabled ? 'probing' : 'disabled';
    for (const source of config.sources) {
      if (source === 'adb') this.adapters.push(new AdbScreenshotAdapter(config.androidUdid));
      if (source === 'simctl')
        this.adapters.push(new IosSimulatorScreenshotAdapter(config.iosUdid ?? 'booted'));
    }
  }

  /** Called by the socket server as browser clients attach/detach. */
  setClientCount(count: number): void {
    this.clientCount = count;
    if (count > 0 && this.config.enabled && !this.timer) void this.start();
    if (count === 0) this.stop();
  }

  getLatestFrame(): { frame: DeviceFrame; seq: number } | undefined {
    return this.latest ? { frame: this.latest, seq: this.seq } : undefined;
  }

  getStatus(): { status: StreamStatus; source?: string; seq: number } {
    return { status: this.status, source: this.active?.name, seq: this.seq };
  }

  private async start(): Promise<void> {
    this.status = 'probing';
    this.active = await this.probe();
    if (!this.active) {
      this.status = 'unavailable';
      log.info('no device frame source available; dashboard will use step screenshots');
      // Re-probe occasionally — a device may be plugged in mid-session.
      this.timer = setTimeout(() => {
        this.timer = undefined;
        if (this.clientCount > 0) void this.start();
      }, 15000);
      return;
    }
    this.status = 'streaming';
    log.info(`streaming device frames via ${this.active.name} every ${this.config.intervalMs}ms`);
    this.loop();
  }

  private loop(): void {
    this.timer = setTimeout(async () => {
      this.timer = undefined;
      if (this.clientCount === 0 || !this.active) return;
      try {
        const frame = await this.active.capture();
        this.latest = frame;
        this.seq += 1;
        this.consecutiveFailures = 0;
        eventBroadcaster.publishFrame({
          seq: this.seq,
          source: this.active.name,
          timestamp: frame.capturedAt,
        });
      } catch (err) {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures === 3) {
          log.warn(`frame capture failing via ${this.active.name}; falling back`, err);
          this.status = 'unavailable';
          this.active = undefined;
          void this.start();
          return;
        }
      }
      this.loop();
    }, this.config.intervalMs);
  }

  private stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private async probe(): Promise<ScreenshotSourceAdapter | undefined> {
    for (const adapter of this.adapters) {
      try {
        if (await adapter.isAvailable()) return adapter;
      } catch {
        /* keep probing */
      }
    }
    return undefined;
  }
}
