/** Display formatting helpers shared across panels. */

export function formatTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour12: false }) +
    '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export function formatDuration(ms?: number): string {
  if (ms === undefined || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}

export function elapsedSince(startIso?: string, endIso?: string): number | undefined {
  if (!startIso) return undefined;
  const start = Date.parse(startIso);
  if (Number.isNaN(start)) return undefined;
  const end = endIso ? Date.parse(endIso) : Date.now();
  return Math.max(0, end - start);
}
