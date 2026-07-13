import { Router } from 'express';
import type { LogIngestionService } from '../services/LogIngestionService.js';

export function logRoutes(logService: LogIngestionService): Router {
  const router = Router();

  router.get('/api/logs', (req, res) => {
    const q = req.query;
    const logs = logService.query({
      runId: str(q.runId),
      scenarioId: str(q.scenarioId),
      stepId: str(q.stepId),
      source: str(q.source),
      level: str(q.level),
      search: str(q.search),
      afterSeq: num(q.afterSeq),
      limit: num(q.limit),
    });
    res.json({ count: logs.length, logs });
  });

  return router;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
}
