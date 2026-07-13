import { useEffect } from 'react';
import { createLiveSocket } from '../services/websocketClient';
import { useRunStore } from '../store/runStore';
import { useLogStore } from '../store/logStore';
import { useLocatorStore } from '../store/locatorStore';
import { useDeviceStore } from '../store/deviceStore';
import type { LogEvent } from '../types/log';
import type { LocatorEvent } from '../types/locator';

/**
 * The single wire between the WebSocket and the stores. Mount once (App).
 * Every store update flows through here so the data path stays auditable.
 */
export function useLiveEvents(): void {
  useEffect(() => {
    const dispose = createLiveSocket({
      onStateChange: (state) => useRunStore.getState().setConnection(state),
      onMessage: (msg) => {
        switch (msg.type) {
          case 'hello': {
            useRunStore.getState().setSnapshot(msg.run);
            useLogStore.getState().setSnapshot(msg.recentLogs ?? []);
            useLocatorStore.getState().setSnapshot(msg.run?.locatorHistory ?? []);
            useDeviceStore.getState().setStreamStatus(msg.streamStatus);
            break;
          }
          case 'event': {
            const event = msg.event;
            if (event.eventType === 'LOG') {
              useLogStore.getState().addLog(event as LogEvent);
            } else {
              useRunStore.getState().applyEvent(event);
              if (event.eventType === 'LOCATOR_USED') {
                useLocatorStore.getState().addLocator(event as LocatorEvent);
              }
            }
            break;
          }
          case 'frame': {
            useDeviceStore.getState().setFrame(msg.seq, msg.source, msg.timestamp);
            break;
          }
        }
      },
    });
    return dispose;
  }, []);
}
