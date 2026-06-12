'use client';

import { useEffect, useState } from 'react';
import type { DonationFlash } from '@/lib/map';

// Тост «Нове місто на мапі» — слухає ту саму подію gramista:flash, що й MapUkraine
// (кидає LiveRefresh із SSE). router.refresh ре-маунтить компонент, тож активний показ
// тримаємо на рівні модуля (патерн OvertakeWatcher).
let pendingName: string | null = null;
let pendingUntil = 0;

export function NewCityWatcher() {
  const [, force] = useState(0);

  useEffect(() => {
    const onFlash = (e: Event) => {
      const f = (e as CustomEvent).detail as DonationFlash | undefined;
      if (!f?.newCity) return;
      pendingName = f.name;
      pendingUntil = Date.now() + 4500;
      force((x) => x + 1);
    };
    window.addEventListener('gramista:flash', onFlash);
    return () => window.removeEventListener('gramista:flash', onFlash);
  }, []);

  // Авто-сховати по завершенні вікна показу.
  useEffect(() => {
    if (!(pendingName && Date.now() < pendingUntil)) return;
    const t = setTimeout(() => force((x) => x + 1), pendingUntil - Date.now());
    return () => clearTimeout(t);
  });

  const show = pendingName && Date.now() < pendingUntil ? pendingName : null;
  if (!show) return null;
  return (
    <div className="newcity-toast" role="status">
      <span className="nc-conf c1" /><span className="nc-conf c2" /><span className="nc-conf c3" />
      🎉 Нове місто на мапі — {show}!
    </div>
  );
}
