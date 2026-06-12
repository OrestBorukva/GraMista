import type { PrismaClient } from '@prisma/client';
import { normalize } from './text';
import { recordAdminAction } from './adminLog';

// Пошук поселень для автодоповнення в Адмінці (§17.5) і публічного «знайди своє місто»:
// за нормалізованою назвою або аліасом. Довідник глобальний (без userId).

export interface SettlementMatch {
  id: string;
  name: string;
  oblast: string | null;
  /** Розрізняє тезок у видачі («Іванівка — Сумська, Конотопський район»). */
  raion: string | null;
}

/**
 * Пошук для автодоповнення адмінки та публічного «знайди своє місто»: спершу збіг
 * префікса (людина друкує початок назви), далі pg_trgm-схожість (одруки) — по назві Й аліасах.
 * Ранжування: префікс → схожість → населення. GIN trgm-індекси існують з міграції init.
 */
export async function searchSettlements(
  db: PrismaClient,
  query: string,
  limit = 8,
): Promise<SettlementMatch[]> {
  const q = normalize(query);
  if (q.length < 2) return [];
  const rows = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL pg_trgm.similarity_threshold = 0.35`);
    return tx.$queryRaw<
      { id: string; name: string; oblast: string | null; raion: string | null; population: number | null; pre: number; sim: number }[]
    >`
      SELECT DISTINCT ON (s.id)
             s.id, s.name, s.oblast, s.raion, s.population,
             (c.form LIKE ${q} || '%')::int AS pre,
             similarity(c.form, ${q})::float AS sim
      FROM (
        SELECT id AS sid, "nameNorm" AS form FROM "Settlement"
        WHERE "nameNorm" LIKE ${q} || '%' OR "nameNorm" % ${q}
        UNION ALL
        SELECT "settlementId", "aliasNorm" FROM "SettlementAlias"
        WHERE "aliasNorm" LIKE ${q} || '%' OR "aliasNorm" % ${q}
      ) c
      JOIN "Settlement" s ON s.id = c.sid
      ORDER BY s.id, pre DESC, sim DESC`;
  });
  rows.sort(
    (a, b) =>
      b.pre - a.pre ||
      b.sim - a.sim ||
      (b.population ?? 0) - (a.population ?? 0) ||
      a.name.localeCompare(b.name, 'uk'),
  );
  return rows.slice(0, limit).map(({ id, name, oblast, raion }) => ({ id, name, oblast, raion }));
}

/**
 * Додає ручний синонім (аліас) місту — надалі донати з цією формою авто-розпізнаються.
 * Дедуп за нормалізованою формою в межах міста. null, якщо міста нема або аліас закороткий.
 * Журналюється (відкат — прибрати створений аліас) ЛИШЕ коли реально додано новий (не дубль).
 * Резолвер (resolveCity) ходить у БД наживо — новий аліас підхоплюється без рестарту воркера.
 */
export async function addAlias(
  db: PrismaClient,
  userId: string,
  settlementId: string,
  alias: string,
): Promise<{ ok: true; aliasNorm: string } | null> {
  const aliasNorm = normalize(alias);
  if (aliasNorm.length < 2) return null;
  return db.$transaction(async (tx) => {
    const settlement = await tx.settlement.findUnique({ where: { id: settlementId }, select: { name: true } });
    if (!settlement) return null;
    const existing = await tx.settlementAlias.findFirst({ where: { settlementId, aliasNorm }, select: { id: true } });
    if (existing) return { ok: true, aliasNorm }; // дубль — без журналу
    const created = await tx.settlementAlias.create({
      data: { settlementId, alias: alias.trim(), aliasNorm, source: 'manual' },
    });
    await recordAdminAction(tx, userId, {
      type: 'addAlias',
      summary: `Додано синонім «${alias.trim()}» місту «${settlement.name}»`,
      payload: { aliasId: created.id, settlementId },
      undoable: true,
    });
    return { ok: true, aliasNorm };
  });
}
