import type { ReactNode } from 'react';
import type { Platform } from '../../types/common';

/** Cosmetic phone bezel around the screen image (toggleable). */
export function DeviceFrame({
  platform,
  visible,
  children,
}: {
  platform?: Platform;
  visible: boolean;
  children: ReactNode;
}) {
  if (!visible) return <div className="device-bare">{children}</div>;
  return (
    <div className={`device-frame ${platform === 'iOS' ? 'device-frame-ios' : 'device-frame-android'}`}>
      <div className="device-frame-notch" />
      <div className="device-frame-screen">{children}</div>
      <div className="device-frame-home" />
    </div>
  );
}
