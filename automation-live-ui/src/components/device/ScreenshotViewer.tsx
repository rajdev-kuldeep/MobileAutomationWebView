/** Small labeled screenshot thumbnail; click opens full size in a new tab. */
export function ScreenshotViewer({
  url,
  label,
  highlight,
}: {
  url: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <a
      className={`shot-thumb ${highlight ? 'shot-thumb-failure' : ''}`}
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`${label} — open full size`}
    >
      <img src={url} alt={label} loading="lazy" />
      <span className="shot-label">{label}</span>
    </a>
  );
}
