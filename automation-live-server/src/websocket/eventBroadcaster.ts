import { EventEmitter } from 'node:events';
import type { LiveViewEvent } from '../models/events.js';

/**
 * Internal pub/sub bus decoupling ingestion (REST) from delivery (WebSocket).
 * Services publish; the socket server is the only subscriber that talks to
 * browsers. Nothing in here knows about Express or ws.
 */
export interface FrameNotification {
  seq: number;
  source: string; // adb | simctl | screenshot-fallback
  timestamp: string;
}

interface BusEvents {
  event: [LiveViewEvent];
  frame: [FrameNotification];
}

class EventBroadcaster extends EventEmitter<BusEvents> {
  publishEvent(event: LiveViewEvent): void {
    this.emit('event', event);
  }

  publishFrame(frame: FrameNotification): void {
    this.emit('frame', frame);
  }
}

export const eventBroadcaster = new EventBroadcaster();
