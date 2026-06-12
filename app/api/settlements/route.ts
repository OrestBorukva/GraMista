import { prisma } from '@/lib/db';
import { searchSettlements } from '@/lib/settlements';

// Автодоповнення міст для Адмінки (§17.5). Довідник глобальний — без userId.
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  const results = await searchSettlements(prisma, q, 8);
  return Response.json(results, { headers: { 'Cache-Control': 'no-store' } });
}
