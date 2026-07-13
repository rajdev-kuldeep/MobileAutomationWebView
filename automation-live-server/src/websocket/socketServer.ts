import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { createLogger } from '../utils/logger.js';
import { eventBroadcaster } from './eventBroadcaster.js';
import type { RunSessionService } from '../services/RunSessionService.js';
import type { DeviceStreamService } from '../services/DeviceStreamService.js';
import type { InMemoryEventStore } from '../storage/InMemoryEventStore.js';

const log = createLogger('SocketServer');

/**
 * WebSocket endpoint: ws://<host>:<port>/ws/live
 *
 * Server → client messages:
 *   { type: "hello",  run, streamStatus, recentLogs }   on connect (snapshot)
 *   { type: "event",  event }                           every ingested event
 *   { type: "frame",  seq, source, timestamp }          new device frame ready
 *   { type: "pong" }                                    reply to client ping
 *
 * Client → server messages:
 *   { type: "ping" }
 *
 * Frames themselves are fetched over HTTP (GET /api/device/frame?seq=N) so the
 * socket stays lightweight and image caching works normally.
 */
export function attachSocketServer(
  httpServer: Server,
  runService: RunSessionService,
  deviceStream: DeviceStreamService,
  memoryStore: InMemoryEventStore,
): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/live' });

  wss.on('connection', (socket) => {
    log.info(`client connected (${wss.clients.size} total)`);
    deviceStream.setClientCount(wss.clients.size);

    send(socket, {
      type: 'hello',
      run: runService.getCurrentRun() ?? null,
      streamStatus: deviceStream.getStatus(),
      recentLogs: memoryStore.getLogs({ limit: 500 }),
    });

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'ping') send(socket, { type: 'pong' });
      } catch {
        /* ignore malformed client messages */
      }
    });

    socket.on('close', () => {
      log.info(`client disconnected (${wss.clients.size} total)`);
      deviceStream.setClientCount(wss.clients.size);
    });
  });

  eventBroadcaster.on('event', (event) => {
    broadcast(wss, { type: 'event', event });
  });

  eventBroadcaster.on('frame', (frame) => {
    broadcast(wss, { type: 'frame', ...frame });
  });

  return wss;
}

function send(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function broadcast(wss: WebSocketServer, payload: unknown): void {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}
