'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireServiceAdmin } from '@/lib/serviceAdmin';
import { recordAdminAction } from '@/lib/adminLog';

const schema = z.object({ collectionId: z.string().min(1).or(z.literal('')) }); // '' = відкріпити

export async function setFeaturedAction(formData: FormData): Promise<void> {
  const adminId = await requireServiceAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const id = parsed.data.collectionId || null;
  if (id) {
    // Прикріпити можна лише активний збір видимого учасника (та сама умова, що й показ).
    const col = await prisma.collection.findFirst({
      where: { id, status: 'active', user: { showOnGlobalMap: true, hiddenFromGlobalMap: false, handle: { not: null } } },
      select: { id: true },
    });
    if (!col) return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.appSetting.upsert({
      where: { id: 'app' },
      update: { featuredCollectionId: id },
      create: { id: 'app', featuredCollectionId: id },
    });
    await recordAdminAction(tx, adminId, {
      type: 'setFeaturedCollection',
      summary: id ? `Прикріплено збір у фокусі /ukraine (${id})` : 'Відкріплено збір у фокусі /ukraine',
      payload: { featuredCollectionId: id },
      undoable: false, // тривіально оборотно тим самим екраном — відкат не потрібен
    });
  });
  revalidatePath('/service');
  revalidatePath('/ukraine');
}

const visibilitySchema = z.object({
  userId: z.string().min(1),
  hidden: z.enum(['true', 'false']),
});

// Модерація: сховати/показати стрімера на /ukraine (виключає з усіх зрізів). Лише адмін.
export async function setParticipantVisibilityAction(formData: FormData): Promise<void> {
  const adminId = await requireServiceAdmin();
  const parsed = visibilitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const hidden = parsed.data.hidden === 'true';
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { name: true } });
  if (!target) return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: parsed.data.userId }, data: { hiddenFromGlobalMap: hidden } });
    await recordAdminAction(tx, adminId, {
      type: 'setParticipantVisibility',
      summary: hidden ? `Сховано з /ukraine: ${target.name}` : `Повернено на /ukraine: ${target.name}`,
      payload: { userId: parsed.data.userId, hidden },
      undoable: false,
    });
  });
  revalidatePath('/service');
  revalidatePath('/ukraine');
}
