import { Router } from 'express';
import type { RunSessionService } from '../services/RunSessionService.js';
import type { DeviceStreamService } from '../services/DeviceStreamService.js';

export function deviceRoutes(
  runService: RunSessionService,
  deviceStream: DeviceStreamService,
): Router {
  const router = Router();

  router.get('/api/device/current', (_req, res) => {
    const run = runService.getCurrentRun();
    res.json({
      deviceInfo: run?.deviceInfo ?? null,
      stream: deviceStream.getStatus(),
    });
  });

  /** Latest live frame. `seq` is only a cache-buster; always serves newest. */
  router.get('/api/device/frame', (_req, res) => {
    const latest = deviceStream.getLatestFrame();
    if (!latest) {
      res.status(404).json({ error: 'no live frame available', stream: deviceStream.getStatus() });
      return;
    }
    res.setHeader('Content-Type', latest.frame.contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Frame-Seq', String(latest.seq));
    res.send(latest.frame.data);
  });

  return router;
}
