import { useCallback, useRef } from 'react';

/**
 * Drag handler for panel divider bars. Returns an onMouseDown handler that
 * tracks the pointer and reports the new size through `onResize`.
 *
 * axis 'x': size = horizontal distance; 'y': vertical.
 * invert: divider sits on the far side (right/bottom panels grow leftward/upward).
 */
export function usePanelResize(
  axis: 'x' | 'y',
  getCurrent: () => number,
  onResize: (size: number) => void,
  invert = false,
) {
  const dragging = useRef(false);

  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startPos = axis === 'x' ? e.clientX : e.clientY;
      const startSize = getCurrent();

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const pos = axis === 'x' ? ev.clientX : ev.clientY;
        const delta = (pos - startPos) * (invert ? -1 : 1);
        onResize(startSize + delta);
      };
      const onUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [axis, getCurrent, onResize, invert],
  );
}
