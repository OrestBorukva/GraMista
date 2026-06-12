import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPublicCollectionArchive } from '@/lib/publicPage';
import { validateHandle } from '@/lib/handle';
import { formatUah, formatDate, pluralMist } from '@/lib/format';
import { TopCities } from '../../TopCities';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ handle: string; id: string }> }): Promise<Metadata> {
  const { handle: raw, id } = await params;
  const v = validateHandle(decodeURIComponent(raw));
  if (!v.ok) return { title: { absolute: 'GraMista' } };
  const a = await getPublicCollectionArchive(prisma, v.handle, id);
  if (!a) return { title: { absolute: 'GraMista' } };
  const title = `${a.name} — архів збору · ${a.profile.name}`;
  const description = `Зібрано ${formatUah(a.raisedUah)} · ${a.cities.length} ${pluralMist(a.cities.length)} у грі`;
  return { title: { absolute: title }, description, openGraph: { title, description } };
}

export default async function CollectionArchivePage({ params }: { params: Promise<{ handle: string; id: string }> }) {
  const { handle: raw, id } = await params;
  const v = validateHandle(decodeURIComponent(raw));
  if (!v.ok) notFound();
  const a = await getPublicCollectionArchive(prisma, v.handle, id);
  if (!a) notFound();

  return (
    <div className="pub-root pub-archive">
      <header className="pub-panel pub-hdr">
        <div className="pub-ava">{(a.profile.name.trim()[0] ?? '?').toUpperCase()}</div>
        <div>
          <div className="pub-hname">{a.name}</div>
          <div className="pub-hsub">
            архів збору · {formatDate(a.startAt.getTime())}
            {a.endAt ? ` — ${formatDate(a.endAt.getTime())}` : ''} ·{' '}
            <Link href={`/${a.profile.handle}`}>{a.profile.name}</Link>
          </div>
        </div>
      </header>

      <section className="pub-panel pub-tiles" aria-label="Підсумок">
        <div className="pub-tile"><div className="l">Зібрано</div><div className="v">{formatUah(a.raisedUah)}</div></div>
        {a.goalUah != null && (
          <div className="pub-tile"><div className="l">Ціль</div><div className="v">{formatUah(a.goalUah)}</div></div>
        )}
        <div className="pub-tile"><div className="l">Донатів</div><div className="v">{a.donationCount}</div></div>
      </section>

      <section className="pub-panel pub-top" aria-label="Топ міст збору">
        <div className="pub-ptitle">Топ міст <span>{a.cities.length} {pluralMist(a.cities.length)}</span></div>
        <TopCities rows={a.cities} />
      </section>

      {a.streams.length > 0 && (
        <section className="pub-panel" aria-label="Стріми збору">
          <div className="pub-ptitle">Стріми збору</div>
          {a.streams.map((s) => (
            <div className="pub-arch-stream" key={s.id}>
              <span>{formatDate(s.startedAt.getTime())}</span> <b>{s.name}</b>{' '}
              {s.url && <a href={s.url} target="_blank" rel="noreferrer">▶ запис</a>}
            </div>
          ))}
        </section>
      )}

      <div className="pub-brand"><a href="/">зроблено на GraMista</a></div>
    </div>
  );
}
