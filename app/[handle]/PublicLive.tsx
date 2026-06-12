'use client';

import { LiveRefresh } from '@/app/LiveRefresh';
import { OvertakeWatcher } from '@/app/OvertakeWatcher';
import { NewCityWatcher } from '@/app/NewCityWatcher';
import type { RankCity } from '@/lib/overtake';

// Живий шар публічної сторінки: SSE → router.refresh (свіжі дані з lib/) + тост «обгін».
// «Спалах» міста малює MapUkraine сам — він слухає подію gramista:flash, яку кидає LiveRefresh.
// scopeKey — id активного збору (рамки топу): входить у viewKey, щоб realtime-перемикання
// збору скидало базову лінію «обгону» й не давало хибних тостів між топами різних зборів.
export function PublicLive({ handle, order, scopeKey }: { handle: string; order: RankCity[]; scopeKey?: string }) {
  return (
    <>
      <LiveRefresh publicHandle={handle} />
      <OvertakeWatcher order={order} viewKey={`pub:${handle}:${scopeKey ?? ''}`} />
      <NewCityWatcher />
    </>
  );
}
