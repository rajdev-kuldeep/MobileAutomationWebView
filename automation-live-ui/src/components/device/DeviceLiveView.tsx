import { useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCw,
  Smartphone,
  ScanEye,
  MonitorOff,
  Radio,
  ImageIcon,
} from 'lucide-react';
import { useDeviceStream } from '../../hooks/useDeviceStream';
import { useSelectedStep } from '../../hooks/useSelectedStep';
import { useUiStore } from '../../store/uiStore';
import { useLocatorStore } from '../../store/locatorStore';
import { useRunStore } from '../../store/runStore';
import { DeviceFrame } from './DeviceFrame';
import { ElementOverlay } from './ElementOverlay';

/**
 * Center panel: the live device screen.
 *
 *  - live mode: frames streamed via the backend adapters (adb / simctl),
 *  - fallback mode: latest framework step screenshot,
 *  - selected-step mode: when a past step is selected, shows that step's
 *    last screenshot instead of the live feed.
 *
 * Controls: zoom, fit, rotate, bezel toggle, locator overlay toggle.
 */
export function DeviceLiveView() {
  const stream = useDeviceStream();
  const { step, isLive } = useSelectedStep();
  const run = useRunStore((s) => s.run);
  const zoom = useUiStore((s) => s.deviceZoom);
  const rotation = useUiStore((s) => s.deviceRotation);
  const frameVisible = useUiStore((s) => s.deviceFrameVisible);
  const overlayVisible = useUiStore((s) => s.overlayVisible);
  const setZoom = useUiStore((s) => s.setDeviceZoom);
  const rotate = useUiStore((s) => s.rotateDevice);
  const toggleFrame = useUiStore((s) => s.toggleDeviceFrame);
  const toggleOverlay = useUiStore((s) => s.toggleOverlay);
  const currentLocator = useLocatorStore((s) => s.current);

  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  // Past step selected → pin its screenshot; otherwise live/fallback stream.
  const stepShot = !isLive && step ? step.screenshots[step.screenshots.length - 1] : undefined;
  const imageUrl = stepShot?.url ?? stream.imageUrl;
  const showingLive = !stepShot && stream.mode === 'live';

  const showOverlay =
    overlayVisible &&
    showingLive &&
    currentLocator?.bounds &&
    run?.currentStepId !== undefined &&
    currentLocator.stepId === run.currentStepId;

  const scaleStyle =
    zoom > 0
      ? { transform: `scale(${zoom}) rotate(${rotation}deg)` }
      : { transform: `rotate(${rotation}deg)` };

  return (
    <div className="device-view">
      <div className="panel-toolbar device-toolbar">
        <span className="panel-title">
          Device
          {showingLive ? (
            <span className="stream-badge stream-live"><Radio size={11} /> live · {stream.source}</span>
          ) : imageUrl ? (
            <span className="stream-badge stream-fallback"><ImageIcon size={11} /> {stepShot ? 'step screenshot' : 'latest screenshot'}</span>
          ) : null}
        </span>
        <div className="toolbar-actions">
          <button className="icon-button" onClick={() => setZoom(zoom === 0 ? 1.25 : zoom + 0.25)} title="Zoom in"><ZoomIn size={14} /></button>
          <button className="icon-button" onClick={() => setZoom(Math.max(0, zoom - 0.25))} title="Zoom out"><ZoomOut size={14} /></button>
          <button className="icon-button" onClick={() => setZoom(0)} title="Fit to screen"><Maximize size={14} /></button>
          <button className="icon-button" onClick={rotate} title="Rotate view"><RotateCw size={14} /></button>
          <button className={`icon-button ${frameVisible ? 'icon-button-active' : ''}`} onClick={toggleFrame} title="Toggle device frame"><Smartphone size={14} /></button>
          <button className={`icon-button ${overlayVisible ? 'icon-button-active' : ''}`} onClick={toggleOverlay} title="Toggle locator overlay"><ScanEye size={14} /></button>
        </div>
      </div>

      <div className="device-stage">
        {imageUrl ? (
          <div className="device-scale" style={scaleStyle}>
            <DeviceFrame platform={run?.platform} visible={frameVisible}>
              <div className="device-image-wrap">
                <img
                  ref={imgRef}
                  className="device-image"
                  src={imageUrl}
                  alt="Device screen"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                />
                {showOverlay && currentLocator?.bounds && (
                  <ElementOverlay
                    bounds={currentLocator.bounds}
                    imageWidth={natural.w}
                    imageHeight={natural.h}
                    label={currentLocator.locator}
                    failed={currentLocator.result !== 'FOUND'}
                  />
                )}
              </div>
            </DeviceFrame>
          </div>
        ) : (
          <div className="panel-empty">
            <MonitorOff size={26} />
            <p>Live device stream unavailable.</p>
            <p className="panel-empty-hint">Falling back to latest step screenshot once one is published.</p>
          </div>
        )}
      </div>
    </div>
  );
}
