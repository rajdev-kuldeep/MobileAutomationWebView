import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DeviceFrame, ScreenshotSourceAdapter } from './ScreenshotSourceAdapter.js';

const execFileAsync = promisify(execFile);

/**
 * Android emulator / physical device frames via `adb exec-out screencap -p`.
 * No file round-trip on the device; PNG bytes stream straight to stdout.
 */
export class AdbScreenshotAdapter implements ScreenshotSourceAdapter {
  readonly name = 'adb';

  constructor(private readonly udid?: string) {}

  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('adb', ['devices'], { timeout: 4000 });
      const devices = stdout
        .split('\n')
        .slice(1)
        .filter((line) => line.trim().endsWith('device'));
      if (devices.length === 0) return false;
      return this.udid ? devices.some((line) => line.startsWith(this.udid!)) : true;
    } catch {
      return false;
    }
  }

  async capture(): Promise<DeviceFrame> {
    const args = this.udid ? ['-s', this.udid] : [];
    const { stdout } = await execFileAsync(
      'adb',
      [...args, 'exec-out', 'screencap', '-p'],
      { encoding: 'buffer', timeout: 8000, maxBuffer: 32 * 1024 * 1024 },
    );
    return { data: stdout, contentType: 'image/png', capturedAt: new Date().toISOString() };
  }
}
