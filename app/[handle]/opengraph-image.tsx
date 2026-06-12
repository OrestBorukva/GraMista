import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/db';
import { getPublicPageCached } from '@/lib/publicPage';
import { validateHandle } from '@/lib/handle';
import { ogFonts } from '@/app/og/reportImage';
import { formatUah, formatPoints } from '@/lib/format';

// Прев'ю-картка посилання /<handle> для Telegram/Discord/Twitter (next/og, як картинки-звітів).
// ⚠ Satori: КОЖЕН <div> із >1 дитиною мусить мати display:flex (пастка з HANDOFF).
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function OgImage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  const v = validateHandle(decodeURIComponent(raw));
  const data = v.ok ? await getPublicPageCached(prisma, v.handle) : null;
  const top3 = data?.fullLeaderboard.slice(0, 3) ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: '#1B1714',
          color: '#F3E9DF',
          fontFamily: 'Onest',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 56, fontWeight: 700 }}>{data?.profile.name ?? 'GraMista'}</div>
          <div style={{ fontSize: 30, color: '#CDBCAB', marginTop: 8 }}>битва міст України — донать і виводь своє місто в топ</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {top3.map((c, i) => (
            <div key={c.settlementId} style={{ display: 'flex', fontSize: 36 }}>
              <div style={{ width: 64, display: 'flex' }}>{MEDALS[i]}</div>
              <div style={{ flex: 1, display: 'flex' }}>{c.name}</div>
              <div style={{ color: '#E2A878', display: 'flex' }}>{formatPoints(c.points)} б</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: 34, color: '#E0B66B', display: 'flex' }}>
            {data ? `зібрано ${formatUah(data.state.totalRaisedUah)}` : ''}
          </div>
          <div style={{ fontSize: 26, color: '#9A8979', display: 'flex' }}>GraMista</div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
