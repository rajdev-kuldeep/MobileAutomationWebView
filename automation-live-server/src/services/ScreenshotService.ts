import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createLogger } from '../utils/logger.js';
import { sanitizeRunId } from '../storage/FileEventStore.js';
import type { ScreenshotEvent } from '../models/events.js';

const log = createLogger('ScreenshotService');

/**
 * Persists inline screenshot payloads and resolves framework screenshot paths
 * to servable files.
 *
 * Two publication modes are supported (the Java bridge picks per event):
 *  1. `imageBase64` inline  → persisted under <dataDir>/runs/<runId>/screenshots,
 *     event rewritten with a stable `url`.
 *  2. `path` reference      → the framework already saved the file (existing
 *     ScreenshotManager output); the server serves it from disk. No duplicate
 *     copies of the screenshot pipeline.
 */
export class ScreenshotService {
  constructor(
    private readonly dataDir: string,
    private readonly screenshotBaseDir: string,
  ) {}

  /** Mutates the event: stores inline payloads, assigns a dashboard URL. */
  process(event: ScreenshotEvent): ScreenshotEvent {
    if (event.imageBase64) {
      try {
        const id = this.persistInline(event);
        event.url = `/api/screenshots/${sanitizeRunId(event.runId)}/${id}`;
      } catch (err) {
        log.warn('failed to persist inline screenshot', err);
      }
      delete event.imageBase64; // never broadcast megabytes over the socket
    } else if (event.path) {
      event.url = `/api/screenshots/file?path=${encodeURIComponent(event.path)}`;
    }
    return event;
  }

  /** Resolve a stored screenshot by id. */
  resolveStored(runId: string, id: string): string | undefined {
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) return undefined;
    const file = path.join(this.storedDir(runId), id);
    return fs.existsSync(file) ? file : undefined;
  }

  /**
   * Resolve a framework screenshot path safely. Relative paths resolve against
   * screenshotBaseDir; absolute paths are allowed only inside base dir or the
   * live-view data dir (prevents the endpoint becoming an arbitrary file read).
   */
  resolveFrameworkPath(rawPath: string): string | undefined {
    const resolved = path.isAbsolute(rawPath)
      ? path.normalize(rawPath)
      : path.resolve(this.screenshotBaseDir, rawPath);
    const allowedRoots = [path.resolve(this.screenshotBaseDir), path.resolve(this.dataDir)];
    const permitted = allowedRoots.some(
      (root) => resolved === root || resolved.startsWith(root + path.sep),
    );
    if (!permitted) {
      log.warn(`refused screenshot path outside allowed roots: ${rawPath}`);
      return undefined;
    }
    return fs.existsSync(resolved) ? resolved : undefined;
  }

  private persistInline(event: ScreenshotEvent): string {
    const dir = this.storedDir(event.runId);
    fs.mkdirSync(dir, { recursive: true });
    const hash = crypto.createHash('sha1').update(event.imageBase64!).digest('hex').slice(0, 10);
    const kind = (event.kind ?? 'shot').toLowerCase().replace(/[^a-z_]/g, '');
    const id = `${Date.now()}_${kind}_${hash}.png`;
    fs.writeFileSync(path.join(dir, id), Buffer.from(event.imageBase64!, 'base64'));
    return id;
  }

  private storedDir(runId: string): string {
    return path.join(this.dataDir, 'runs', sanitizeRunId(runId), 'screenshots');
  }
}
