import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../utils/logger.js';
import { sanitizeRunId } from '../storage/FileEventStore.js';
import type { PageSourceEvent } from '../models/events.js';

const log = createLogger('PageSourceService');

/**
 * Keeps the latest page-source snapshot per run (memory) and persists each
 * snapshot to disk for download from the failure panel / locator inspector.
 */
export class PageSourceService {
  private latest = new Map<string, PageSourceEvent>();

  constructor(private readonly dataDir: string) {}

  process(event: PageSourceEvent): PageSourceEvent {
    if (event.source) {
      try {
        const dir = path.join(this.dataDir, 'runs', sanitizeRunId(event.runId), 'page-source');
        fs.mkdirSync(dir, { recursive: true });
        const id = `${Date.now()}_${(event.stepId ?? 'snapshot').replace(/[^a-zA-Z0-9_-]/g, '')}.xml`;
        fs.writeFileSync(path.join(dir, id), event.source, 'utf8');
        event.url = `/api/page-source/${sanitizeRunId(event.runId)}/${id}`;
      } catch (err) {
        log.warn('failed to persist page source', err);
      }
      delete event.source; // keep the broadcast event small
    }
    this.latest.set(event.runId, event);
    return event;
  }

  getLatest(runId?: string): PageSourceEvent | undefined {
    if (runId) return this.latest.get(runId);
    const all = [...this.latest.values()];
    return all[all.length - 1];
  }

  resolveFile(runId: string, id: string): string | undefined {
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) return undefined;
    const file = path.join(this.dataDir, 'runs', sanitizeRunId(runId), 'page-source', id);
    return fs.existsSync(file) ? file : undefined;
  }
}
