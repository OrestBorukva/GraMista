import type { CSSProperties, ReactNode } from 'react';
import { LiveRefresh } from '@/app/LiveRefresh';
import type { OverlayConfig } from '@/lib/overlayConfig';

// Кольори для chroma key (OBS «Color Key»). none → прозоро (під віджетом нічого не малюємо).
const CHROMA: Record<string, string | undefined> = {
  none: undefined,
  green: '#00B140',
  blue: '#0047FF',
  magenta: '#FF00FF',
};

// Обгортка кожного віджета: клас стилю + масштаб (zoom працює в Chromium/OBS CEF) + chroma-фон,
// і монтує LiveRefresh (SSE → router.refresh) — спільне живе оновлення для всіх віджетів.
export function OverlayShell({ config, children, channelKey }: { config: OverlayConfig; children: ReactNode; channelKey?: string }) {
  const bg = CHROMA[config.chroma];
  const style: CSSProperties = {
    ...(bg ? { background: bg } : {}),
    ...(config.scale !== 100 ? { zoom: config.scale / 100 } : {}),
  };
  return (
    <div className={`ov-root st-${config.style}`} style={style}>
      {config.live && <LiveRefresh channelKey={channelKey} />}
      {children}
    </div>
  );
}
