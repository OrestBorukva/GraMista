// Період змагання (Тиждень / Місяць / Весь час) — єдине джерело логіки вікна.
// Використовують і дашборд (getState/мапа/лічильники), і getPeriod у streams.ts.

export type Range = 'week' | 'month' | 'all';

export interface PeriodWindow {
  /** включно: createdAt >= from */
  from?: Date;
  /** виключно: createdAt < to */
  to?: Date;
}

/** Безпечний розбір значення з URL (?period=…) — будь-що невідоме → 'all'. */
export function parseRange(v: unknown): Range {
  return v === 'week' || v === 'month' ? v : 'all';
}

/** Межі вікна для періоду. 'week' — останні 7 днів; 'month' — від 1-го числа; 'all' — без меж. */
export function windowFor(range: Range, now: Date = new Date()): PeriodWindow {
  if (range === 'week') return { from: new Date(now.getTime() - 7 * 86400000) };
  if (range === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
  return {};
}

/** Prisma-фільтр по createdAt для вікна (або undefined, якщо «весь час» — без меж). */
export function createdAtWhere(w: PeriodWindow): { gte?: Date; lt?: Date } | undefined {
  if (!w.from && !w.to) return undefined;
  return { ...(w.from ? { gte: w.from } : {}), ...(w.to ? { lt: w.to } : {}) };
}
