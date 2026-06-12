'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { updateStream, deleteStream } from '@/lib/streams';

// Тонкі Server Actions для вкладки «Стріми»: Zod-валідація → lib/streams → ревалідація.
// Назва активного стріму показується й у спільній шапці, тож ревалідуємо весь layout.

const UpdateInput = z.object({
  id: z.string().min(1),
  name: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(120).optional()),
  startedAt: z.coerce.date().optional(),
  // порожнє поле кінця → не чіпаємо (undefined); задане → встановлюємо
  endedAt: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.date().optional()),
});

/** Редагувати стрім: назва/час + прив'язка до збору (кінець не раніше початку — гарантує lib). */
export async function updateStreamAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const parsed = UpdateInput.parse({
    id: formData.get('id'),
    name: formData.get('name'),
    startedAt: formData.get('startedAt'),
    endedAt: formData.get('endedAt'),
  });
  // collectionId: відсутнє поле → не чіпаємо; '' → відв'язати (null); id → прив'язати.
  const rawCol = formData.get('collectionId');
  const collectionId = rawCol === null ? undefined : typeof rawCol === 'string' && rawCol !== '' ? rawCol : null;

  // url: поле у формі завжди; '' → очистити (null); інакше нормалізуємо (додаємо https:// за потреби) і валідуємо.
  const rawUrl = formData.get('url');
  let url: string | null | undefined = undefined;
  if (typeof rawUrl === 'string') {
    const t = rawUrl.trim();
    url = t === '' ? null : z.string().url('Невірне посилання').max(500).parse(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  }

  // notes: '' → очистити (null); інакше — текст (до 2000 символів).
  const rawNotes = formData.get('notes');
  let notes: string | null | undefined = undefined;
  if (typeof rawNotes === 'string') {
    const t = rawNotes.trim();
    notes = t === '' ? null : t.slice(0, 2000);
  }

  await updateStream(prisma, U, parsed.id, {
    ...(parsed.name != null ? { name: parsed.name } : {}),
    ...(parsed.startedAt != null ? { startedAt: parsed.startedAt } : {}),
    ...(parsed.endedAt != null ? { endedAt: parsed.endedAt } : {}),
    ...(url !== undefined ? { url } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(collectionId !== undefined ? { collectionId } : {}),
  });
  revalidatePath('/', 'layout');
  redirect(`/streams/${parsed.id}`);
}

const DeleteInput = z.object({ id: z.string().min(1) });

/** Видалити стрім: донати/бали лишаються (відв'язуються від стріму), повертаємось до списку. */
export async function deleteStreamAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { id } = DeleteInput.parse({ id: formData.get('id') });
  await deleteStream(prisma, U, id);
  revalidatePath('/', 'layout');
  redirect('/streams');
}
