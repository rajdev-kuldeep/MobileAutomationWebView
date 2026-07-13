import type { LiveViewEvent, LogEvent } from '../models/events.js';

/**
 * Ring-buffered in-memory event store. Bounded so long runs cannot exhaust
 * memory; the FileEventStore keeps the complete journal on disk.
 */
export class InMemoryEventStore {
  private events: LiveViewEvent[] = [];
  private logs: LogEvent[] = [];

  constructor(
    private readonly maxEvents: number,
    private readonly maxLogs: number,
  ) {}

  append(event: LiveViewEvent): void {
    if (event.eventType === 'LOG') {
      this.logs.push(event as LogEvent);
      if (this.logs.length > this.maxLogs) this.logs.splice(0, this.logs.length - this.maxLogs);
      return;
    }
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  getEvents(runId?: string, afterSeq?: number): LiveViewEvent[] {
    return this.events.filter(
      (e) =>
        (runId === undefined || e.runId === runId) &&
        (afterSeq === undefined || (e.seq ?? 0) > afterSeq),
    );
  }

  getLogs(filter?: {
    runId?: string;
    scenarioId?: string;
    stepId?: string;
    source?: string;
    level?: string;
    afterSeq?: number;
    limit?: number;
  }): LogEvent[] {
    let out = this.logs;
    if (filter) {
      out = out.filter(
        (l) =>
          (filter.runId === undefined || l.runId === filter.runId) &&
          (filter.scenarioId === undefined || l.scenarioId === filter.scenarioId) &&
          (filter.stepId === undefined || l.stepId === filter.stepId) &&
          (filter.source === undefined || l.source === filter.source) &&
          (filter.level === undefined || l.level === filter.level) &&
          (filter.afterSeq === undefined || (l.seq ?? 0) > filter.afterSeq),
      );
    }
    const limit = filter?.limit ?? 1000;
    return out.length > limit ? out.slice(out.length - limit) : out;
  }

  clear(): void {
    this.events = [];
    this.logs = [];
  }
}
