import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { getCollection } from '@/lib/collections';
import { collectionReportImage } from '@/lib/reports';
import { reportImageResponse } from '@/app/og/reportImage';

// Картинка-звіт збору — PNG через next/og. nodejs-рантайм (читаємо шрифт із диска).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const U = await requireUserId();
  const { id } = await params;
  const r = await getCollection(prisma, U, id);
  if (!r) return new Response('Збір не знайдено', { status: 404 });
  return reportImageResponse(collectionReportImage(r.collection));
}
