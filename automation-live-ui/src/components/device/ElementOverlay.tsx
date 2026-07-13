import type { ElementBounds } from '../../types/common';

interface Props {
  bounds: ElementBounds;
  /** Natural pixel size of the rendered screenshot, for scaling the box. */
  imageWidth: number;
  imageHeight: number;
  label?: string;
  failed?: boolean;
}

/**
 * Draws the current locator's bounding box on top of the device image.
 * Coordinates are in device pixels; the overlay is positioned with
 * percentages so it survives any CSS scaling of the image.
 */
export function ElementOverlay({ bounds, imageWidth, imageHeight, label, failed }: Props) {
  if (imageWidth <= 0 || imageHeight <= 0) return null;
  const style = {
    left: `${(bounds.x / imageWidth) * 100}%`,
    top: `${(bounds.y / imageHeight) * 100}%`,
    width: `${(bounds.width / imageWidth) * 100}%`,
    height: `${(bounds.height / imageHeight) * 100}%`,
  };
  return (
    <div className={`element-overlay ${failed ? 'element-overlay-failed' : ''}`} style={style}>
      {label && <span className="element-overlay-label">{label}</span>}
    </div>
  );
}
