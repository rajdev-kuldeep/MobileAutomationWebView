import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../utils/logger.js';
import type { LiveViewEvent } from '../models/events.js';

const log = createLogger('FileEventStore');

/**
 * Append-only JSONL journal, one file per run:
 *   <dataDir>/runs/<runId>/events.jsonl
 *
 * The journal is the durable record used for run export and future
 * historical replay (Phase 3). Writes are fire-and-forget so ingestion
 * latency never depends on disk.
 */
export class FileEventStore {
  private streams = new Map<string, fs.WriteStream>();

  constructor(private readonly dataDir: string) {
    fs.mkdirSync(path.join(dataDir, 'runs'), { recursive: true });
  }

  runDir(runId: string): string {
    return path.join(this.dataDir, 'runs', sanitizeRunId(runId));
  }

  append(event: LiveViewEvent): void {
    try {
      const stream = this.streamFor(event.runId);
      stream.write(JSON.stringify(event) + '\n');
    } catch (err) {
      log.warn(`journal write failed for run ${event.runId}`, err);
    }
  }

  async readRun(runId: string): Promise<LiveViewEvent[]> {
    const file = path.join(this.runDir(runId), 'events.jsonl');
    try {
      const raw = await fs.promises.readFile(file, 'utf8');
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as LiveViewEvent);
    } catch {
      return [];
    }
  }

  listRuns(): string[] {
    try {
      return fs
        .readdirSync(path.join(this.dataDir, 'runs'), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  close(runId: string): void {
    const stream = this.streams.get(runId);
    if (stream) {
      stream.end();
      this.streams.delete(runId);
    }
  }

  private streamFor(runId: string): fs.WriteStream {
    let stream = this.streams.get(runId);
    if (!stream) {
      const dir = this.runDir(runId);
      fs.mkdirSync(dir, { recursive: true });
      stream = fs.createWriteStream(path.join(dir, 'events.jsonl'), { flags: 'a' });
      stream.on('error', (err) => log.warn(`journal stream error for ${runId}`, err));
      this.streams.set(runId, stream);
    }
    return stream;
  }
}

export function sanitizeRunId(runId: string): string {
  return runId.replace(/[^a-zA-Z0-9._-]/g, '_');
}
