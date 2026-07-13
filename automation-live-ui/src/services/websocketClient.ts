/**
 * Reconnecting WebSocket client for /ws/live.
 *
 * The server pushes:
 *   { type: "hello", run, streamStatus, recentLogs }
 *   { type: "event", event }
 *   { type: "frame", seq, source, timestamp }
 */
import type { LiveViewEvent, RunSession } from '../types/run';
import type { LogEvent } from '../types/log';
import type { DeviceStreamStatus } from '../types/device';

export interface HelloMessage {
  type: 'hello';
  run: RunSession | null;
  streamStatus: DeviceStreamStatus;
  recentLogs: LogEvent[];
}

export interface EventMessage {
  type: 'event';
  event: LiveViewEvent;
}

export interface FrameMessage {
  type: 'frame';
  seq: number;
  source: string;
  timestamp: string;
}

export type ServerMessage = HelloMessage | EventMessage | FrameMessage | { type: 'pong' };

export type ConnectionState = 'connecting' | 'open' | 'closed';

export interface WebsocketHandlers {
  onMessage: (msg: ServerMessage) => void;
  onStateChange: (state: ConnectionState) => void;
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;

export function createLiveSocket(handlers: WebsocketHandlers): () => void {
  let socket: WebSocket | null = null;
  let attempts = 0;
  let closedByUser = false;
  let reconnectTimer: number | undefined;

  const wsUrl = () => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/ws/live`;
  };

  const connect = () => {
    handlers.onStateChange('connecting');
    socket = new WebSocket(wsUrl());

    socket.onopen = () => {
      attempts = 0;
      handlers.onStateChange('open');
    };

    socket.onmessage = (raw) => {
      try {
        handlers.onMessage(JSON.parse(raw.data as string) as ServerMessage);
      } catch {
        /* ignore malformed frame */
      }
    };

    socket.onclose = () => {
      handlers.onStateChange('closed');
      if (closedByUser) return;
      attempts += 1;
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** Math.min(attempts, 4));
      reconnectTimer = window.setTimeout(connect, delay);
    };

    socket.onerror = () => socket?.close();
  };

  connect();

  return () => {
    closedByUser = true;
    if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
