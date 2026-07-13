import type { LocatorEvent, LocatorQuality } from '../models/events.js';

/**
 * Grades locator quality when the Java bridge does not supply it, so the
 * Locator Inspector always shows a badge.
 *
 *   GOOD        → resource-id / accessibility id
 *   ACCEPTABLE  → UiSelector text/description matching, iOS predicate/class chain
 *   RISKY       → relative XPath
 *   BAD         → absolute XPath
 */
export class LocatorEventService {
  enrich(event: LocatorEvent): LocatorEvent {
    if (!event.quality) event.quality = this.grade(event.strategy, event.locator);
    return event;
  }

  grade(strategy: string | undefined, locator: string): LocatorQuality {
    const s = (strategy ?? '').toLowerCase();
    const l = locator ?? '';

    if (s.includes('resource-id') || s.includes('accessibility') || s === 'id') return 'GOOD';
    if (s.includes('uiselector') || s.includes('predicate') || s.includes('class chain') || s.includes('classchain'))
      return 'ACCEPTABLE';
    if (s.includes('xpath') || l.startsWith('/') || l.startsWith('(')) {
      return isAbsoluteXPath(l) ? 'BAD' : 'RISKY';
    }
    if (s.includes('class')) return 'RISKY';
    return 'ACCEPTABLE';
  }
}

function isAbsoluteXPath(locator: string): boolean {
  // Absolute: starts with a single "/" (not "//") or chains raw hierarchy indices.
  const trimmed = locator.replace(/^\(/, '');
  if (trimmed.startsWith('//')) return /\/hierarchy|\[\d+\]\/.*\[\d+\]\/.*\[\d+\]/.test(trimmed);
  return trimmed.startsWith('/');
}
