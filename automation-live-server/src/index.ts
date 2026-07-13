import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { serverConfig } from './config/serverConfig.js';
import { createLogger } from './utils/logger.js';
import { InMemoryEventStore } from './storage/InMemoryEventStore.js';
import { FileEventStore } from './storage/FileEventStore.js';
import { RunSessionService } from './services/RunSessionService.js';
import { ScreenshotService } from './services/ScreenshotService.js';
import { LocatorEventService } from './services/LocatorEventService.js';
import { FailureAnalysisService } from './services/FailureAnalysisService.js';
import { LogIngestionService } from './services/LogIngestionService.js';
import { PageSourceService } from './services/PageSourceService.js';
import { DeviceStreamService } from './services/DeviceStreamService.js';
import { attachSocketServer } from './websocket/socketServer.js';
import { eventRoutes } from './routes/eventRoutes.js';
import { runRoutes } from './routes/runRoutes.js';
import { deviceRoutes } from './routes/deviceRoutes.js';
import { screenshotRoutes } from './routes/screenshotRoutes.js';
import { logRoutes } from './routes/logRoutes.js';
import { pageSourceRoutes } from './routes/pageSourceRoutes.js';

const log = createLogger('Server');

// ---- composition root -------------------------------------------------
const memoryStore = new InMemoryEventStore(
  serverConfig.maxEventsInMemory,
  serverConfig.maxLogEventsInMemory,
);
const fileStore = new FileEventStore(serverConfig.dataDir);
const runService = new RunSessionService(memoryStore, fileStore);
const screenshotService = new ScreenshotService(
  serverConfig.dataDir,
  serverConfig.screenshotBaseDir,
);
const locatorService = new LocatorEventService();
const failureService = new FailureAnalysisService();
const logService = new LogIngestionService(memoryStore);
const pageSourceService = new PageSourceService(serverConfig.dataDir);
const deviceStream = new DeviceStreamService(serverConfig.deviceStream);

// ---- HTTP app ----------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' })); // inline screenshots / page source

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'automation-live-server',
    uptimeSec: Math.round(process.uptime()),
    currentRunId: runService.getCurrentRun()?.runId ?? null,
  });
});

// PAGE_SOURCE_CAPTURED needs its own enrichment; run it before generic ingestion.
app.use((req, _res, next) => {
  if (req.method === 'POST' && req.path === '/api/events' && req.body) {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const e of events) {
      if (e && e.eventType === 'PAGE_SOURCE_CAPTURED') pageSourceService.process(e);
    }
  }
  next();
});

app.use(eventRoutes(runService, screenshotService, locatorService, failureService));
app.use(runRoutes(runService, fileStore));
app.use(deviceRoutes(runService, deviceStream));
app.use(screenshotRoutes(runService, screenshotService));
app.use(logRoutes(logService));
app.use(pageSourceRoutes(pageSourceService));

// Serve the built UI when present → single URL experience at :4545.
if (fs.existsSync(serverConfig.uiDistDir)) {
  app.use(express.static(serverConfig.uiDistDir));
  app.get(/^\/(?!api\/|ws\/).*/, (_req, res) => {
    res.sendFile(path.join(serverConfig.uiDistDir, 'index.html'));
  });
  log.info(`serving UI from ${serverConfig.uiDistDir}`);
} else {
  log.info('UI build not found — run the Vite dev server (npm run dev in automation-live-ui)');
}

// ---- boot --------------------------------------------------------------
const httpServer = http.createServer(app);
attachSocketServer(httpServer, runService, deviceStream, memoryStore);

httpServer.listen(serverConfig.port, serverConfig.host, () => {
  log.info(`Cashi Automation Live View server listening on http://localhost:${serverConfig.port}`);
  log.info(`event ingestion:  POST http://localhost:${serverConfig.port}/api/events`);
  log.info(`live websocket:   ws://localhost:${serverConfig.port}/ws/live`);
  log.info(`data directory:   ${serverConfig.dataDir}`);
});
