import type { BaseEvent } from './common';

export type LogSource =
  | 'FRAMEWORK'
  | 'CUCUMBER'
  | 'APPIUM'
  | 'DEVICE'
  | 'API'
  | 'LOCATOR'
  | 'SCREENSHOT'
  | 'TESTDATA'
  | 'RECOVERY'
  | 'SSO'
  | 'POPUP'
  | 'TESTHUB'
  | 'LIVEVIEW';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

export interface LogEvent extends BaseEvent {
  eventType: 'LOG';
  source: LogSource;
  level: LogLevel;
  message: string;
  logger?: string;
  thread?: string;
}

export const LOG_SOURCES: LogSource[] = [
  'FRAMEWORK',
  'CUCUMBER',
  'APPIUM',
  'DEVICE',
  'API',
  'LOCATOR',
  'SCREENSHOT',
  'TESTDATA',
  'RECOVERY',
  'SSO',
  'POPUP',
  'TESTHUB',
  'LIVEVIEW',
];

export const LOG_LEVELS: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
