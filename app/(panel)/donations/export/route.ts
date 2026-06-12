import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { listAllDonations, donationsToCsv, parseDonationFilter, parseDonationSort } from '@/lib/donations';

// Тонкий роут: розбір фільтрів+сортування із query → lib → CSV-файл (як на сторінці).
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const U = await requireUserId();
  const params = new URL(req.url).searchParams;
  const filter = parseDonationFilter({
    q: params.get('q') ?? undefined,
    min: params.get('min') ?? undefined,
    max: params.get('max') ?? undefined,
    status: params.get('status') ?? undefined,
    city: params.get('city') ?? undefined,
    stream: params.get('stream') ?? undefined,
    period: params.get('period') ?? undefined,
  });
  const { sort, dir } = parseDonationSort({
    sort: params.get('sort') ?? undefined,
    dir: params.get('dir') ?? undefined,
  });

  const rows = await listAllDonations(prisma, U, filter, sort, dir);
  const csv = donationsToCsv(rows);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="gramista-donations.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
