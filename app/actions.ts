'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { startStream, stopStream } from '@/lib/streams';
import { setCityBattle } from '@/lib/settings';

// Тонкі Server Actions: Zod-валідація входу → виклик lib/ → ревалідація.
// Уся бізнес-логіка — в lib/. Тут лише межа: розбір FormData й оновлення панелі.
// Старт/стоп/тумблер впливають на СПІЛЬНУ шапку (layout панелі), тож ревалідуємо
// весь layout (а не лише дашборд) — інакше шапка на інших вкладках не оновиться.

const StartInput = z.object({ name: z.string().trim().max(120).optional() });

/** Почати стрім. Порожня назва → lib дасть «Стрім N» за замовчуванням. */
export async function startStreamAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const raw = formData.get('name');
  const { name } = StartInput.parse({ name: typeof raw === 'string' ? raw : undefined });
  await startStream(prisma, U, name ?? '');
  revalidatePath('/', 'layout');
}

/** Завершити активний стрім. */
export async function stopStreamAction(): Promise<void> {
  const U = await requireUserId();
  await stopStream(prisma, U);
  revalidatePath('/', 'layout');
}

const ToggleInput = z.object({ on: z.enum(['true', 'false']) });

/** Перемкнути «битву міст». on — бажаний НОВИЙ стан (надсилається з кнопки). */
export async function setCityBattleAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { on } = ToggleInput.parse({ on: formData.get('on') });
  await setCityBattle(prisma, U, on === 'true');
  revalidatePath('/', 'layout');
}
