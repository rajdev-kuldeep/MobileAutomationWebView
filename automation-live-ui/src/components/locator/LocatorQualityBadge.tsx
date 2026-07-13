import type { LocatorQuality } from '../../types/locator';

const TITLES: Record<LocatorQuality, string> = {
  GOOD: 'resource-id / accessibility id — stable',
  ACCEPTABLE: 'UiSelector / predicate matching — acceptable',
  RISKY: 'partial XPath — may break on layout changes',
  BAD: 'absolute XPath — brittle, prefer resource-id or accessibility id',
};

export function LocatorQualityBadge({ quality }: { quality?: LocatorQuality }) {
  if (!quality) return null;
  return (
    <span className={`quality-badge quality-${quality.toLowerCase()}`} title={TITLES[quality]}>
      {quality}
    </span>
  );
}
