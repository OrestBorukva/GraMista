import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { testDb, resetDynamic } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { handleMonoEvent, findActiveMonoSource, monoSilentDays } from '../lib/monoHook';

const U = DEFAULT_USER_ID;
let SRC: { id: string; userId: string; monoAccountId: string | null };

beforeEach(async () => {
  await resetDynamic();
  // resetDynamic не чистить DonationSource — прибираємо і створюємо своє.
  await testDb.donationSource.deleteMany({ where: { userId: U } });
  SRC = await testDb.donationSource.create({
    data: { userId: U, type: 'monobank', monoAccountId: 'jar-acc-1', webhookSecret: 's3cret', title: 'На дрони' },
    select: { id: true, userId: true, monoAccountId: true },
  });
});

after(async () => { await testDb.$disconnect(); });

function ev(over: Partial<{ account: string; id: string; amount: number; currencyCode: number; comment?: string; description?: string; counterName?: string }> = {}) {
  return {
    type: 'StatementItem',
    data: {
      account: over.account ?? 'jar-acc-1',
      statementItem: {
        id: over.id ?? 'tx1',
        time: 1760000000,
        description: over.description ?? 'Від: Іван Тестовий',
        comment: over.comment,
        amount: over.amount ?? 25000,
        currencyCode: over.currencyCode ?? 980,
        counterName: over.counterName,
      },
    },
  };
}

test('подія з банки з коментарем-містом → донат + місто + бали', async () => {
  const r = await handleMonoEvent(testDb, SRC, ev({ comment: 'Львів', amount: 25000 }));
  assert.equal(r, 'processed');
  const d = await testDb.donation.findUnique({ where: { userId_externalId: { userId: U, externalId: 'tx1' } } });
  assert.ok(d);
  assert.equal(d.amount.toNumber(), 250); // 25000 коп = 250 грн
  assert.equal(d.donorName, 'Іван Тестовий'); // зрізане «Від: »
  assert.equal(d.settlementId, 'lviv');
});

test('чужий рахунок (не обрана банка) → skipped, у БД нічого', async () => {
  const r = await handleMonoEvent(testDb, SRC, ev({ account: 'personal-card', comment: 'Львів' }));
  assert.equal(r, 'skipped');
  assert.equal(await testDb.donation.count({ where: { userId: U } }), 0);
});

test('відʼємна сума (витрата) і не-гривня → skipped', async () => {
  assert.equal(await handleMonoEvent(testDb, SRC, ev({ amount: -5000 })), 'skipped');
  assert.equal(await handleMonoEvent(testDb, SRC, ev({ currencyCode: 840 })), 'skipped');
  assert.equal(await testDb.donation.count({ where: { userId: U } }), 0);
});

test('дубль (ретрай monobank) → бали не подвоюються', async () => {
  await handleMonoEvent(testDb, SRC, ev({ comment: 'Львів', amount: 50000, id: 'dup1' }));
  await handleMonoEvent(testDb, SRC, ev({ comment: 'Львів', amount: 50000, id: 'dup1' }));
  assert.equal(await testDb.donation.count({ where: { userId: U } }), 1);
  const pts = await testDb.pointEvent.aggregate({ where: { userId: U }, _sum: { points: true } });
  assert.equal(pts._sum.points?.toNumber(), 5); // 500 грн = 5 балів, один раз
});

test('сміттєвий payload → skipped без падіння', async () => {
  assert.equal(await handleMonoEvent(testDb, SRC, { hello: 'world' }), 'skipped');
  assert.equal(await handleMonoEvent(testDb, SRC, null), 'skipped');
});

test('counterName має пріоритет над description', async () => {
  await handleMonoEvent(testDb, SRC, ev({ counterName: 'Марія К.', comment: 'Київ', id: 'tx9' }));
  const d = await testDb.donation.findUnique({ where: { userId_externalId: { userId: U, externalId: 'tx9' } } });
  assert.equal(d?.donorName, 'Марія К.');
});

test('оброблена подія оновлює lastEventAt джерела', async () => {
  await handleMonoEvent(testDb, SRC, ev({ comment: 'Львів' }));
  const s = await testDb.donationSource.findUnique({ where: { id: SRC.id } });
  assert.ok(s?.lastEventAt);
});

test('донат привʼязується до джерела (sourceId)', async () => {
  await handleMonoEvent(testDb, SRC, ev({ comment: 'Львів', id: 'src1' }));
  const d = await testDb.donation.findUnique({ where: { userId_externalId: { userId: U, externalId: 'src1' } } });
  assert.equal(d?.sourceId, SRC.id);
});

test('findActiveMonoSource: активний секрет → джерело з полями для обробки', async () => {
  const s = await findActiveMonoSource(testDb, 's3cret');
  assert.deepEqual(s, { id: SRC.id, userId: U, monoAccountId: 'jar-acc-1' });
});

test('findActiveMonoSource: невідомий секрет і відключене джерело → null', async () => {
  assert.equal(await findActiveMonoSource(testDb, 'no-such-secret'), null);
  await testDb.donationSource.update({ where: { id: SRC.id }, data: { status: 'inactive' } });
  assert.equal(await findActiveMonoSource(testDb, 's3cret'), null);
});

test('monoSilentDays: тиша рахується від lastEventAt, без подій — від createdAt', () => {
  const now = new Date('2026-06-12T12:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  // подій ще не було, джерело свіже → не тиша
  assert.equal(monoSilentDays({ lastEventAt: null, createdAt: daysAgo(2) }, now), null);
  // подій не було тиждень із моменту підключення → тиша 8 днів
  assert.equal(monoSilentDays({ lastEventAt: null, createdAt: daysAgo(8) }, now), 8);
  // остання подія була нещодавно → не тиша, навіть якщо джерело старе
  assert.equal(monoSilentDays({ lastEventAt: daysAgo(3), createdAt: daysAgo(100) }, now), null);
  // остання подія давно → тиша
  assert.equal(monoSilentDays({ lastEventAt: daysAgo(10), createdAt: daysAgo(100) }, now), 10);
});
