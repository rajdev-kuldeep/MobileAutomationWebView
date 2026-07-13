import type { BaseEvent, Platform } from './common';

export interface DeviceInfoEvent extends BaseEvent {
  eventType: 'DEVICE_INFO';
  platform: Platform;
  deviceName?: string;
  udid?: string;
  osVersion?: string;
  environment?: string;
  executionMode?: string;
  appiumPort?: number;
  systemPort?: number;
  chromeDriverPort?: number;
  wdaPort?: number;
  appiumSessionId?: string;
  wdaSessionId?: string;
  xcodeRuntime?: string;
  implicitWaitSec?: number;
  appPackage?: string;
  appActivity?: string;
  bundleId?: string;
}

export type StreamStatus = 'streaming' | 'unavailable' | 'disabled' | 'probing';

export interface DeviceStreamStatus {
  status: StreamStatus;
  source?: string;
  seq: number;
}
