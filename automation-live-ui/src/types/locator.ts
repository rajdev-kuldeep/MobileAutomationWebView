import type { BaseEvent, ElementBounds, Platform } from './common';

export type LocatorQuality = 'GOOD' | 'ACCEPTABLE' | 'RISKY' | 'BAD';
export type LocatorResult = 'FOUND' | 'NOT_FOUND' | 'STALE' | 'TIMEOUT' | 'ERROR';

export interface LocatorEvent extends BaseEvent {
  eventType: 'LOCATOR_USED';
  page?: string;
  method?: string;
  action?: string;
  platform?: Platform;
  strategy?: string;
  locator: string;
  quality?: LocatorQuality;
  waitStrategy?: string;
  timeoutMs?: number;
  pollingMs?: number;
  durationMs?: number;
  result?: LocatorResult;
  retryCount?: number;
  elementText?: string;
  bounds?: ElementBounds;
  exceptionType?: string;
  message?: string;
}
