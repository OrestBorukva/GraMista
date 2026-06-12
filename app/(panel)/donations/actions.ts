'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { moveDonationToStream } from '@/lib/streams';

// Тонкі Server Actions вкладки «Донати»: Zod-валідація → lib → ревалідація.

const MoveInput = z.object({
  externalId: z.string().min(1),
  // '' → без стріму (null); інакше — id стріму
  streamId: z.preprocess((v) => (v === '' ? null : v), z.string().min(1).nullable()),
});

/** Перенести донат в інший стрім (бали їдуть разом; '' → без стріму). */
export async function moveDonationAction(formData: FormData): Promise<void> {
  const U = await requireUserId();
  const { externalId, streamId } = MoveInput.parse({
    externalId: formData.get('externalId'),
    streamId: formData.get('streamId'),
  });
  await moveDonationToStream(prisma, U, externalId, streamId);
  // бали міняють приналежність стрімам → впливає на топ стрімів/збори; шапка теж читає стрім
  revalidatePath('/', 'layout');
}
