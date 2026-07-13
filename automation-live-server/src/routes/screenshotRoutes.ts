import { Router } from 'express';
import type { RunSessionService } from '../services/RunSessionService.js';
import type { ScreenshotService } from '../services/ScreenshotService.js';

export function screenshotRoutes(
  runService: RunSessionService,
  screenshotService: ScreenshotService,
): Router {
  const router = Router();

  /** Metadata for the most recent screenshot of the current run. */
  router.get('/api/screenshots/latest', (_req, res) => {
    const shot = runService.getCurrentRun()?.lastScreenshot;
    if (!shot) {
      res.status(404).json({ error: 'no screenshot yet' });
      return;
    }
    res.json(shot);
  });

  /** Serve a framework-saved screenshot by its published path (sandboxed). */
  router.get('/api/screenshots/file', (req, res) => {
    const rawPath = String(req.query.path ?? '');
    const resolved = rawPath ? screenshotService.resolveFrameworkPath(rawPath) : undefined;
    if (!resolved) {
      res.status(404).json({ error: 'screenshot not found or not permitted' });
      return;
    }
    res.sendFile(resolved);
  });

  /** Serve a screenshot that was published inline and persisted server-side. */
  router.get('/api/screenshots/:runId/:id', (req, res) => {
    const resolved = screenshotService.resolveStored(req.params.runId, req.params.id);
    if (!resolved) {
      res.status(404).json({ error: 'screenshot not found' });
      return;
    }
    res.sendFile(resolved);
  });

  return router;
}
