import { Router } from 'express';
import type { RunSessionService } from '../services/RunSessionService.js';
import type { FileEventStore } from '../storage/FileEventStore.js';

export function runRoutes(runService: RunSessionService, fileStore: FileEventStore): Router {
  const router = Router();

  router.get('/api/runs', (_req, res) => {
    res.json({ runs: runService.listRunIds() });
  });

  router.get('/api/runs/current', (_req, res) => {
    const run = runService.getCurrentRun();
    if (!run) {
      res.status(404).json({ error: 'no active run' });
      return;
    }
    res.json(run);
  });

  // Full event journal export — for debugging, run archiving, and AI analysis.
  router.get('/api/runs/:runId/events', async (req, res) => {
    const events = await fileStore.readRun(req.params.runId);
    if (events.length === 0) {
      res.status(404).json({ error: `no journal for run ${req.params.runId}` });
      return;
    }
    res.json({ runId: req.params.runId, events });
  });

  router.get('/api/runs/:runId', (req, res) => {
    const run = runService.getRun(req.params.runId);
    if (!run) {
      res.status(404).json({ error: `unknown run ${req.params.runId}` });
      return;
    }
    res.json(run);
  });

  return router;
}
