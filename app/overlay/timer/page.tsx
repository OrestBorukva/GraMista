import { prisma } from '@/lib/db';
import { userIdByOverlayKey } from '@/lib/publicUser';
import { parseOverlayConfig } from '@/lib/overlayConfig';
import { OverlayShell } from '@/app/overlay/OverlayShell';
import { LiveTimer } from '@/app/LiveTimer';

export const dynamic = 'force-dynamic';
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TimerOverlay({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const key = typeof sp.k === 'string' ? sp.k : '';
  const U = await userIdByOverlayKey(prisma, key);
  if (!U) return <div className="ov-empty">Силку оверлея не розпізнано. Відкрий «Оверлеї» в панелі й скопіюй свіже посилання.</div>;
  const cfg = parseOverlayConfig(sp);
  const s = await prisma.stream.findFirst({ where: { userId: U, endedAt: null }, orderBy: { startedAt: 'desc' } });

  return (
    <OverlayShell config={cfg} channelKey={key}>
      <section className="ov ov-timer">
        {cfg.title && <div className="ov-title">⏱ Стрім</div>}
        <div className="timer-val">
          {s ? <LiveTimer startedAt={s.startedAt.getTime()} initialMs={Date.now() - s.startedAt.getTime()} /> : '0:00:00'}
        </div>
      </section>
    </OverlayShell>
  );
}
