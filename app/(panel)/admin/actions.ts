'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { assignCity, assignCityBulk, reassignCity, adjustPoints, resetCity, resetAll } from '@/lib/admin';
import { addAlias } from '@/lib/settlements';
import { undoAdminAction } from '@/lib/adminLog';

// Тонкі Server Actions Адмінки (§17.5): Zod-валідація → lib/admin → ревалідація.
// Дії змінюють бали → впливають на дашборд/мапу/топ, тож ревалідуємо весь layout.

const AssignInput = z.object({ externalId: z.string().min(1), settlementId: z.string().min(1) });

/** Призначити місто нерозпізнаному донату → донарахувати бали (та сама логіка, що й у живого донату). */
export async function assignCityAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { externalId, settlementId } = AssignInput.parse({
    externalId: formData.get('externalId'),
    settlementId: formData.get('settlementId'),
  });
  await assignCity(prisma, U, externalId, settlementId);
  revalidatePath('/', 'layout');
}

const ReassignInput = z.object({ externalId: z.string().min(1), settlementId: z.string().min(1) });

/** Змінити місто ВЖЕ розпізнаному донату → перерахувати бали обох міст (replay, поріг враховано). */
export async function reassignCityAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { externalId, settlementId } = ReassignInput.parse({
    externalId: formData.get('externalId'),
    settlementId: formData.get('settlementId'),
  });
  await reassignCity(prisma, U, externalId, settlementId);
  revalidatePath('/', 'layout');
}

const BulkAssignInput = z.object({
  externalIds: z.array(z.string().min(1)).min(1, 'Оберіть хоча б один донат'),
  settlementId: z.string().min(1),
});

/** Масово призначити одне місто обраним нерозпізнаним донатам. */
export async function bulkAssignCityAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { externalIds, settlementId } = BulkAssignInput.parse({
    externalIds: formData.getAll('externalIds'),
    settlementId: formData.get('settlementId'),
  });
  await assignCityBulk(prisma, U, externalIds, settlementId);
  revalidatePath('/', 'layout');
}

const AdjustInput = z.object({
  settlementId: z.string().min(1),
  points: z.coerce.number().refine((n) => Number.isFinite(n) && n !== 0, 'Потрібне ненульове число'),
});

/** Ручне коригування балів міста (може бути від'ємним). */
export async function adjustPointsAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { settlementId, points } = AdjustInput.parse({
    settlementId: formData.get('settlementId'),
    points: formData.get('points'),
  });
  await adjustPoints(prisma, U, settlementId, points);
  revalidatePath('/', 'layout');
}

const AliasInput = z.object({
  settlementId: z.string().min(1),
  alias: z.string().trim().min(2, 'Синонім закороткий').max(64),
});

/** Додати ручний синонім місту (надалі авто-розпізнається; для живих донатів — після перезапуску інжесту). */
export async function addAliasAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { settlementId, alias } = AliasInput.parse({
    settlementId: formData.get('settlementId'),
    alias: formData.get('alias'),
  });
  await addAlias(prisma, U, settlementId, alias);
  revalidatePath('/admin');
}

const ResetCityInput = z.object({ settlementId: z.string().min(1) });

/** Скинути бали + скарбнички одного міста (історія донатів лишається). */
export async function resetCityAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { settlementId } = ResetCityInput.parse({ settlementId: formData.get('settlementId') });
  await resetCity(prisma, U, settlementId);
  revalidatePath('/', 'layout');
}

/** Скинути ВСІ бали + скарбнички (історія донатів і стріми лишаються). */
export async function resetAllAction(): Promise<void> {
  const U = await requireUserId();
  await resetAll(prisma, U);
  revalidatePath('/', 'layout');
}

const UndoInput = z.object({ id: z.string().min(1) });

/** Відкотити дію з журналу (оборотну) — зворотна операція + позначка undoneAt. */
export async function undoActionAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { id } = UndoInput.parse({ id: formData.get('id') });
  await undoAdminAction(prisma, U, id);
  revalidatePath('/', 'layout');
}
