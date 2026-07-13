/**
 * A pluggable source of raw device screen frames.
 *
 * Adapters are probed in configured order; the first available one wins.
 * Replaceable by design — an scrcpy/MJPEG adapter can be added later without
 * touching DeviceStreamService consumers.
 */
export interface DeviceFrame {
  data: Buffer;
  contentType: string; // image/png | image/jpeg
  capturedAt: string;
}

export interface ScreenshotSourceAdapter {
  /** Short identifier used in config + WS frame notifications. */
  readonly name: string;
  /** Cheap availability probe (binary on PATH, device attached, ...). */
  isAvailable(): Promise<boolean>;
  /** Capture one frame; throw on failure (service handles backoff). */
  capture(): Promise<DeviceFrame>;
}
