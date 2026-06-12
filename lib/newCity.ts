import type { PrismaClient } from '@prisma/client';

// «Відкривач» міста: донат, на який посилається НАЙПЕРШИЙ PointEvent міста в межах збору
// (createdAt asc, далі id asc — детерміновано). НЕ зберігається в БД — обчислюється з журналу,
// тому самовиправляється після reassignCity/відкатів адміна (перший запис міг належати
// іншому донатеру, ніж перерахований ланцюжок, і збережений прапорець оновити було б нікому).

export interface OpenerPair {
  settlementId: string;
  collectionId: string | null;
}

/** Ключ мапи відповідей — спільний для cityOpeners і його споживачів. */
export function openerKey(settlementId: string, collectionId: string | null): string {
  return `${settlementId}:${collectionId ?? ''}`;
}

/**
 * Донати-відкривачі для набору пар (місто, збір): Map<openerKey, donationId найпершого
 * PointEvent пари>. null — перший запис без донату (нарахування адміна). Пара без жодного
 * PointEvent у мапу не потрапляє (міста ще нема на мапі).
 */
export async function cityOpeners(
  db: PrismaClient,
  userId: string,
  pairs: OpenerPair[],
): Promise<Map<string, string | null>> {
  if (pairs.length === 0) return new Map();
  const settlementIds = [...new Set(pairs.map((p) => p.settlementId))];
  const collectionIds = [...new Set(pairs.map((p) => p.collectionId).filter((c): c is string => c !== null))];
  const wantNull = pairs.some((p) => p.collectionId === null);

  // DISTINCT за (місто, збір) при сортуванні createdAt/id asc → перший запис кожної пари.
  const firsts = await db.pointEvent.findMany({
    where: {
      userId,
      settlementId: { in: settlementIds },
      OR: [
        ...(collectionIds.length > 0 ? [{ collectionId: { in: collectionIds } }] : []),
        ...(wantNull ? [{ collectionId: null }] : []),
      ],
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    distinct: ['settlementId', 'collectionId'],
    select: { settlementId: true, collectionId: true, donationId: true },
  });

  const wanted = new Set(pairs.map((p) => openerKey(p.settlementId, p.collectionId)));
  const out = new Map<string, string | null>();
  for (const f of firsts) {
    const k = openerKey(f.settlementId, f.collectionId);
    if (wanted.has(k)) out.set(k, f.donationId);
  }
  return out;
}
