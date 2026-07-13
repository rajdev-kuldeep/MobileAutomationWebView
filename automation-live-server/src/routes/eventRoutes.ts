import { Router } from 'express';
import { createLogger } from '../utils/logger.js';
import { isKnownEventType } from '../models/events.js';
import type { LiveViewEvent, LocatorEvent, ScreenshotEvent, StepEvent } from '../models/events.js';
import type { RunSessionService } from '../services/RunSessionService.js';
import type { ScreenshotService } from '../services/ScreenshotService.js';
import type { LocatorEventService } from '../services/LocatorEventService.js';
import type { FailureAnalysisService } from '../services/FailureAnalysisService.js';

const log = createLogger('EventRoutes');

/**
 * POST /api/events — the single ingestion door for the Java bridge.
 * Accepts one event object or an array (the bridge batches under load).
 * Always answers quickly; enrichment failures never reject the request.
 */
export function eventRoutes(
  runService: RunSessionService,
  screenshotService: ScreenshotService,
  locatorService: LocatorEventService,
  failureService: FailureAnalysisService,
): Router {
  const router = Router();

  router.post('/api/events', (req, res) => {
    const body = req.body;
    const events: unknown[] = Array.isArray(body) ? body : [body];
    let accepted = 0;
    const errors: string[] = [];

    for (const raw of events) {
      const problem = validate(raw);
      if (problem) {
        errors.push(problem);
        continue;
      }
      const event = raw as LiveViewEvent;
      try {
        enrich(event, screenshotService, locatorService);
        runService.ingest(event);

        // Auto-classify failures the framework did not classify itself.
        if (event.eventType === 'STEP_FAILED' && !(event as StepEvent).failureClassification) {
          runService.ingest(failureService.classify(event as StepEvent));
        }
        accepted += 1;
      } catch (err) {
        log.error('event ingestion failed', err);
        errors.push('internal ingestion error');
      }
    }

    res.status(errors.length > 0 && accepted === 0 ? 400 : 202).json({ accepted, errors });
  });

  return router;
}

function enrich(
  event: LiveViewEvent,
  screenshotService: ScreenshotService,
  locatorService: LocatorEventService,
): void {
  if (event.eventType === 'SCREENSHOT_CAPTURED') screenshotService.process(event as ScreenshotEvent);
  if (event.eventType === 'LOCATOR_USED') locatorService.enrich(event as LocatorEvent);
}

function validate(raw: unknown): string | undefined {
  if (raw === null || typeof raw !== 'object') return 'event must be an object';
  const e = raw as Record<string, unknown>;
  if (!isKnownEventType(e.eventType)) return `unknown eventType: ${String(e.eventType)}`;
  if (typeof e.runId !== 'string' || e.runId.length === 0) return 'runId is required';
  if (typeof e.timestamp !== 'string') return 'timestamp is required';
  return undefined;
}
