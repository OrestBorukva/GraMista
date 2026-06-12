'use client';
import { useEffect, useState } from 'react';
import { formatUah } from '@/lib/format';

// router.refresh (LiveRefresh) ре-маунтить компонент, тож попереднє значення тримаємо на рівні
// модуля (за id), щоб анімувати прокрутку на ЖИВУ зміну, а не скидатись щоразу. Перший показ — без анімації.
const last = new Map<string, number>();

export function CountUp({ id, value }: { id: string; value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const from = last.get(id) ?? value;
    last.set(id, value);
    if (from === value) {
      setShown(value);
      return;
    }
    const start = Date.now();
    const dur = 800;
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [id, value]);

  return <>{formatUah(shown)}</>;
}
