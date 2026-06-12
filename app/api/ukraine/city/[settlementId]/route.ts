import { z } from 'zod';
import { prisma } from '@/lib/db';
import { globalCityDetail } from '@/lib/globalMap';

export const dynamic = 'force-dynamic';

const idSchema = z.string().min(1).max(64);

// Глобальна картка міста /ukraine: розбивка ₴ по стрімерах + останні донати (анонімно, без
// текстів). Тонкий роут поверх globalCityDetail; 404 на невідоме/непідсвічене місто.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ settlementId: string }> },
): Promise<Response> {
  const { settlementId } = await params;
  const id = idSchema.safeParse(decodeURIComponent(settlementId));
  if (!id.success) return Response.json({ error: 'not found' }, { status: 404 });
  const detail = await globalCityDetail(prisma, id.data);
  if (!detail) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(detail);
}
