import { prisma } from '@/lib/db';
import { validateHandle } from '@/lib/handle';
import { userIdByHandle } from '@/lib/publicUser';
import { cityRaceSeries } from '@/lib/race';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ handle: string }> }): Promise<Response> {
  const { handle } = await ctx.params;
  const v = validateHandle(decodeURIComponent(handle));
  if (!v.ok) return new Response('not found', { status: 404 });
  const userId = await userIdByHandle(prisma, v.handle);
  if (!userId) return new Response('not found', { status: 404 });
  // Гонка — у межах поточного змагання (активного збору); нема збору → за весь час.
  const col = await prisma.collection.findFirst({ where: { userId, status: 'active' }, select: { id: true } });
  return Response.json(await cityRaceSeries(prisma, userId, { collectionId: col?.id }));
}
