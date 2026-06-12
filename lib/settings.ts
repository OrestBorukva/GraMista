import type { PrismaClient } from '@prisma/client';

/**
 * Глобальний тумблер «битва міст». Коли false — нові донати рахуються лише як гроші,
 * без балів містам (гейт у processDonation). Повертає новий стан.
 * Див. docs/specs/2026-06-07-money-and-cities.md.
 */
export async function setCityBattle(db: PrismaClient, userId: string, on: boolean): Promise<boolean> {
  const u = await db.user.update({
    where: { id: userId },
    data: { cityBattle: on },
    select: { cityBattle: true },
  });
  return u.cityBattle;
}
