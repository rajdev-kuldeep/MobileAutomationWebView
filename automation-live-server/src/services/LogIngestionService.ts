import type { InMemoryEventStore } from '../storage/InMemoryEventStore.js';
import type { LogEvent } from '../models/events.js';

export interface LogQuery {
  runId?: string;
  scenarioId?: string;
  stepId?: string;
  source?: string;
  level?: string;
  search?: string;
  afterSeq?: number;
  limit?: number;
}

/**
 * Read-side API over ingested LOG events. Text search happens server-side so
 * the REST endpoint can be used by CLI/AI consumers, while the browser applies
 * its own richer client-side filtering to the live stream.
 */
export class LogIngestionService {
  constructor(private readonly store: InMemoryEventStore) {}

  query(q: LogQuery): LogEvent[] {
    let logs = this.store.getLogs({
      runId: q.runId,
      scenarioId: q.scenarioId,
      stepId: q.stepId,
      source: q.source,
      level: q.level,
      afterSeq: q.afterSeq,
      limit: q.limit ?? 1000,
    });
    if (q.search) {
      const needle = q.search.toLowerCase();
      logs = logs.filter((l) => l.message.toLowerCase().includes(needle));
    }
    return logs;
  }
}
