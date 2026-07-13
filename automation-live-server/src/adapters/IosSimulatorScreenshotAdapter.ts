import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DeviceFrame, ScreenshotSourceAdapter } from './ScreenshotSourceAdapter.js';

const execFileAsync = promisify(execFile);

/**
 * iOS Simulator frames via `xcrun simctl io <udid|booted> screenshot -`.
 * macOS-only; isAvailable() returns false everywhere else.
 */
export class IosSimulatorScreenshotAdapter implements ScreenshotSourceAdapter {
  readonly name = 'simctl';

  constructor(private readonly udid: string = 'booted') {}

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'darwin') return false;
    try {
      const { stdout } = await execFileAsync('xcrun', ['simctl', 'list', 'devices', 'booted'], {
        timeout: 4000,
      });
      return stdout.includes('(Booted)');
    } catch {
      return false;
    }
  }

  async capture(): Promise<DeviceFrame> {
    const { stdout } = await execFileAsync(
      'xcrun',
      ['simctl', 'io', this.udid, 'screenshot', '--type=png', '-'],
      { encoding: 'buffer', timeout: 8000, maxBuffer: 32 * 1024 * 1024 },
    );
    return { data: stdout, contentType: 'image/png', capturedAt: new Date().toISOString() };
  }
}
