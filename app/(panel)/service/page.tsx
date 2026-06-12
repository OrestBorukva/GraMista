import { prisma } from '@/lib/db';
import { requireServiceAdmin } from '@/lib/serviceAdmin';
import { setFeaturedAction, setParticipantVisibilityAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Сервіс' };

// Адмінка СЕРВІСУ — «збір у фокусі» + модерація учасників /ukraine. Гейт за роллю (неадмін → 404).
export default async function ServicePage() {
  await requireServiceAdmin();

  const [collections, setting, participants] = await Promise.all([
    prisma.collection.findMany({
      where: { status: 'active', user: { showOnGlobalMap: true, hiddenFromGlobalMap: false, handle: { not: null } } },
      select: { id: true, name: true, user: { select: { name: true, handle: true } } },
      orderBy: { startAt: 'desc' },
    }),
    prisma.appSetting.findUnique({ where: { id: 'app' }, select: { featuredCollectionId: true } }),
    prisma.user.findMany({
      where: { showOnGlobalMap: true, handle: { not: null } },
      select: { id: true, name: true, handle: true, hiddenFromGlobalMap: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  const current = setting?.featuredCollectionId ?? '';

  return (
    <main className="settings">
      <h1>Адмінка сервісу</h1>

      <section>
        <h2>Збір у фокусі на /ukraine</h2>
        <p>Прикріплений збір показується великою карткою зверху глобальної мапи. Лише активні збори учасників.</p>
        {collections.length === 0 ? (
          <p>Зараз немає активних зборів учасників, які можна прикріпити.</p>
        ) : (
          <form action={setFeaturedAction}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0' }}>
              <input type="radio" name="collectionId" value="" defaultChecked={current === ''} /> Без фокуса
            </label>
            {collections.map((c) => (
              <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0' }}>
                <input type="radio" name="collectionId" value={c.id} defaultChecked={current === c.id} />{' '}
                {c.name} — {c.user.name} (/{c.user.handle})
              </label>
            ))}
            <button type="submit">Зберегти</button>
          </form>
        )}
      </section>

      <section>
        <h2>Учасники /ukraine</h2>
        <p>Стрімери з увімкненою участю. Можна сховати порушника — він зникне з глобальної мапи (з усіх зрізів), навіть якщо сам лишив галочку.</p>
        {participants.length === 0 ? (
          <p>Поки немає учасників.</p>
        ) : (
          participants.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '6px 0' }}>
              <span style={{ flex: 1 }}>
                {p.name} <span style={{ color: 'var(--ink-3, #9A8979)' }}>(/{p.handle})</span>
                {p.hiddenFromGlobalMap && <b style={{ color: 'var(--danger, #E06B57)' }}> · схований</b>}
              </span>
              <form action={setParticipantVisibilityAction}>
                <input type="hidden" name="userId" value={p.id} />
                <input type="hidden" name="hidden" value={p.hiddenFromGlobalMap ? 'false' : 'true'} />
                <button type="submit">{p.hiddenFromGlobalMap ? 'Повернути' : 'Сховати'}</button>
              </form>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
