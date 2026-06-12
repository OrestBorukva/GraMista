'use client';

import { useSearchParams } from 'next/navigation';
import { formatUah } from '@/lib/format';
import type { PeriodTotal } from '@/lib/dashboard';

// Шапка показує суму/к-сть донатів за ТОЙ САМИЙ період, що обрано на дашборді
// (узгодження з лічильником стрічки — пункт D3). Шапка в layout не бачить ?period,
// тож читаємо його з URL тут. На вкладках без періоду (Донати/Стріми/…) ?period нема
// → показуємо «за весь час». Підпис біля числа завжди каже, що це за число.

interface Totals {
  all: PeriodTotal;
  week: PeriodTotal;
  month: PeriodTotal;
  stream: PeriodTotal | null;
  collection: PeriodTotal | null;
}

type Key = 'all' | 'week' | 'month' | 'stream' | 'collection';

const LABEL: Record<Key, string> = {
  collection: 'за збір',
  stream: 'за стрім',
  week: 'за тиждень',
  month: 'за місяць',
  all: 'за весь час',
};

export function HeaderStats({ totals }: { totals: Totals }) {
  const raw = useSearchParams().get('period');
  // Без параметра шапка показує те саме, що дашборд за замовчуванням — активний збір (нема → весь час).
  // Явний вибір (week/month/all) поважаємо; stream/collection — лише коли вони реально є.
  const key: Key =
    raw === 'week' || raw === 'month' || raw === 'all' ? raw
    : raw === 'stream' && totals.stream ? 'stream'
    : raw === 'collection' && totals.collection ? 'collection'
    : totals.collection ? 'collection'
    : 'all';
  const t: PeriodTotal =
    key === 'stream' ? (totals.stream ?? totals.all)
    : key === 'collection' ? (totals.collection ?? totals.all)
    : totals[key];

  return (
    <>
      <span className="stat">
        <b className="accent">{formatUah(t.sumUah)}</b>
      </span>
      <span className="sep" />
      <span className="stat">
        <b>{t.count}</b> донатів <span className="stat-period">{LABEL[key]}</span>
      </span>
    </>
  );
}
