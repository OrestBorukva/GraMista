'use client';

import { LiveRefresh } from '@/app/LiveRefresh';

// Живий шар /ukraine: SSE-канал ?g=1 → router.refresh (свіжі агрегати з lib/globalMap) +
// «спалах» міста (MapUkraine слухає gramista:flash, яку кидає LiveRefresh). «Обгін» —
// фіча сторінки стрімера, тут не потрібен.
export function GlobalLive() {
  return <LiveRefresh globalChannel />;
}
