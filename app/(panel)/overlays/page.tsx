import { OverlayBuilder } from '@/app/OverlayBuilder';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { ensureOverlayKey } from '@/lib/publicUser';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Оверлеї' };

export default async function OverlaysPage() {
  const U = await requireUserId();
  const overlayKey = await ensureOverlayKey(prisma, U);
  return (
    <div className="tab-overlays scroll">
      <p className="ov-intro">
        Кожен віджет — окрема силка. Додай у OBS як <b>Browser Source</b> і розстав, як зручно. Налаштуй
        вигляд і скопіюй силку.
      </p>
      <OverlayBuilder overlayKey={overlayKey} />
    </div>
  );
}
