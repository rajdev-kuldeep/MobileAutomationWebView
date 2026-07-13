import { Router } from 'express';
import type { PageSourceService } from '../services/PageSourceService.js';

export function pageSourceRoutes(pageSourceService: PageSourceService): Router {
  const router = Router();

  router.get('/api/page-source/latest', (req, res) => {
    const runId = typeof req.query.runId === 'string' ? req.query.runId : undefined;
    const latest = pageSourceService.getLatest(runId);
    if (!latest) {
      res.status(404).json({ error: 'no page source captured yet' });
      return;
    }
    res.json(latest);
  });

  router.get('/api/page-source/:runId/:id', (req, res) => {
    const file = pageSourceService.resolveFile(req.params.runId, req.params.id);
    if (!file) {
      res.status(404).json({ error: 'page source not found' });
      return;
    }
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(file);
  });

  return router;
}
