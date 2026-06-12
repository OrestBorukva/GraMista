import { z } from 'zod';
import { prisma } from '@/lib/db';
import { validateHandle } from '@/lib/handle';
import { userIdByHandle } from '@/lib/publicUser';
import { cityDetail } from '@/lib/dashboard';
import { leaderboard } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

const idSchema = z.string().min(1).max(64);

// Публічна картка міста: реюз cityDetail (імена ВЖЕ анонімізовані, є область) + місце в топі.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string; settlementId: string }> },
): Promise<Response> {
  const { handle, settlementId } = await ctx.params;
  const v = validateHandle(decodeURIComponent(handle));
  if (!v.ok) return new Response('not found', { status: 404 });
  const userId = await userIdByHandle(prisma, v.handle);
  if (!userId) return new Response('not found', { status: 404 });
  const id = idSchema.safeParse(decodeURIComponent(settlementId));
  if (!id.success) return new Response('not found', { status: 404 });

  // Картка міста й ранг — у межах активного збору (поточне змагання); нема збору → за весь час.
  const col = await prisma.collection.findFirst({ where: { userId, status: 'active' }, select: { id: true } });
  const [detail, rows] = await Promise.all([
    cityDetail(prisma, userId, id.data, {}, { collectionId: col?.id }),
    leaderboard(prisma, userId, { limit: 100_000, ...(col ? { collectionId: col.id } : {}) }),
  ]);
  if (!detail) return new Response('not found', { status: 404 });
  const i = rows.findIndex((r) => r.settlementId === id.data);
  return Response.json({ detail, place: i >= 0 ? i + 1 : null });
}
