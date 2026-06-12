import type { PrismaClient } from '@prisma/client';
import { leaderboard } from './leaderboard';

// «Гонка міст» (§18): кумулятивні бали топ-міст по днях за останні N днів — із журналу
// PointEvent (SSOT балів). Дні — від місцевої півночі.

export interface RaceSeries {
  settlementId: string;
  name: string;
  /** Кумулятивна сума балів на кінець кожного дня вікна. */
  cumulative: number[];
}

export interface RaceData {
  /** Підписи днів, напр. "1.06". */
  dayLabels: string[];
  series: RaceSeries[];
}

/** Чисте відро: кумулятив по днях [start; start + days діб). Поза вікном — ігнорується. */
export function bucketCumulative(
  events: { at: Date; points: number }[],
  start: Date,
  days: number,
): number[] {
  const perDay = new Array<number>(days).fill(0);
  const dayMs = 24 * 3600 * 1000;
  for (const e of events) {
    const i = Math.floor((e.at.getTime() - start.getTime()) / dayMs);
    if (i >= 0 && i < days) perDay[i] = (perDay[i] ?? 0) + e.points;
  }
  let acc = 0;
  return perDay.map((v) => Math.round((acc += v) * 10) / 10);
}

export async function cityRaceSeries(
  db: PrismaClient,
  userId: string,
  opts: { days?: number; top?: number; now?: Date; collectionId?: string } = {},
): Promise<RaceData> {
  const days = opts.days ?? 14;
  const top = opts.top ?? 5;
  const now = opts.now ?? new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await leaderboard(db, userId, { from: start, limit: top, ...(opts.collectionId ? { collectionId: opts.collectionId } : {}) });
  const ids = rows.map((r) => r.settlementId);
  const events = ids.length
    ? await db.pointEvent.findMany({
        where: { userId, settlementId: { in: ids }, createdAt: { gte: start }, ...(opts.collectionId ? { collectionId: opts.collectionId } : {}) },
        select: { settlementId: true, createdAt: true, points: true },
      })
    : [];
  const byCity = new Map<string, { at: Date; points: number }[]>(ids.map((id) => [id, []]));
  for (const e of events) {
    if (e.settlementId) byCity.get(e.settlementId)?.push({ at: e.createdAt, points: e.points.toNumber() });
  }
  const dayLabels = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  return {
    dayLabels,
    series: rows.map((r) => ({
      settlementId: r.settlementId,
      name: r.name,
      cumulative: bucketCumulative(byCity.get(r.settlementId) ?? [], start, days),
    })),
  };
}
