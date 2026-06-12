'use client';

import { useEffect, useState } from 'react';
import { formatDuration } from '@/lib/format';

/**
 * Живий таймер стріму. Server Component не оновлюється сам, тож тривалість тікає тут.
 * initialMs — тривалість, порахована на сервері (щоб перший рендер збігся й не було
 * hydration-mismatch); після монтування рахуємо від startedAt у реальному часі.
 */
export function LiveTimer({ startedAt, initialMs }: { startedAt: number; initialMs: number }) {
  const [ms, setMs] = useState(initialMs);

  useEffect(() => {
    const tick = () => setMs(Date.now() - startedAt);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return <>{formatDuration(ms)}</>;
}
