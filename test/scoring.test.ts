import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { testDb, resetDynamic } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { applyDonation } from '../lib/scoring';
import { leaderboard } from '../lib/leaderboard';

const U = DEFAULT_USER_ID;

interface Item {
  externalId: string;
  donorName: string;
  amountUah: number;
  message: string;
  city: string | null;
}

/** Топ як [settlementId, бали з точністю 4 знаки] — щоб порівняння не залежало від float vs Decimal. */
function shape(rows: { settlementId: string; points: number }[]): [string, number][] {
  return rows
    .map((r) => [r.settlementId, Math.round(r.points * 1e4) / 1e4] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

async function runDb(items: Item[]): Promise<void> {
  for (const d of items) {
    await applyDonation(testDb, U, d, d.city, null);
  }
}

beforeEach(async () => {
  await resetDynamic();
});

after(async () => {
  await testDb.$disconnect();
});

test('топ балів: поріг + скарбничка + flush дають очікувані бали', async () => {
  const items: Item[] = [
    { externalId: 'd1', donorName: 'Іван Петренко', amountUah: 150, message: 'З Києва!', city: 'kyiv' }, // ≥100 → 1.5
    { externalId: 'd2', donorName: 'Олена', amountUah: 60, message: 'Львів', city: 'lviv' }, // у скарбничку
    { externalId: 'd3', donorName: 'Олена', amountUah: 50, message: 'Львів', city: 'lviv' }, // 110 → flush → 1.1
    { externalId: 'd4', donorName: 'Іван Петренко', amountUah: 30, message: 'Київ', city: 'kyiv' }, // скарбничка 30, балів 0
    { externalId: 'd5', donorName: 'Без міста', amountUah: 500, message: 'дякую', city: null }, // нерозпізнаний
  ];

  await runDb(items);
  const dbTop = await leaderboard(testDb, U, { limit: 50 });

  assert.deepEqual(shape(dbTop), [['kyiv', 1.5], ['lviv', 1.1]]);
});

test('ApplyResult: вердикт matched/points/pending для порога й flush', async () => {
  await resetDynamic();

  const a = await applyDonation(testDb, U, { externalId: 'a1', donorName: 'Тест', amountUah: 40, message: 'Київ' }, 'kyiv', null);
  // 40 < 100 → у скарбничку, балів нема
  assert.deepEqual([a.matched, a.pointsAwarded, a.pendingUah], [true, 0, 40]);

  const b = await applyDonation(testDb, U, { externalId: 'a2', donorName: 'Тест', amountUah: 70, message: 'Київ' }, 'kyiv', null);
  // 40+70=110 ≥ 100 → flush 1.1, скарбничка порожня
  assert.equal(b.matched, true);
  assert.equal(b.pendingUah, 0);
  assert.equal(Math.round(b.pointsAwarded * 1e4) / 1e4, 1.1);
});

test('скарбничка ізольована по зборах: 80₴ у зборі А + 30₴ у зборі Б → жодного flush', async () => {
  const a = await testDb.collection.create({ data: { userId: U, name: 'А', status: 'completed' } });
  const b = await testDb.collection.create({ data: { userId: U, name: 'Б', status: 'active' } });
  await applyDonation(testDb, U, { externalId: 'p1', donorName: 'Іван', amountUah: 80, message: 'київ' }, 'kyiv', null, { collectionId: a.id });
  const r = await applyDonation(testDb, U, { externalId: 'p2', donorName: 'Іван', amountUah: 30, message: 'київ' }, 'kyiv', null, { collectionId: b.id });
  assert.equal(r.pointsAwarded, 0); // 80 і 30 у РІЗНИХ скарбничках — порога 100 ніхто не перетнув
  assert.equal(r.pendingUah, 30);
  const pools = await testDb.donorCityPool.findMany({ where: { userId: U }, orderBy: { accumulatedAmount: 'asc' } });
  assert.equal(pools.length, 2);
  assert.deepEqual(pools.map((p) => p.collectionId).sort(), [a.id, b.id].sort());
});

test('донат і його PointEvent штампуються collectionId; flush лишається у своєму зборі', async () => {
  const c = await testDb.collection.create({ data: { userId: U, name: 'Серія', status: 'active' } });
  const r = await applyDonation(testDb, U, { externalId: 's1', donorName: 'Оля', amountUah: 250, message: 'львів' }, 'lviv', null, { collectionId: c.id });
  assert.equal(r.pointsAwarded, 2.5);
  const d = await testDb.donation.findUniqueOrThrow({ where: { userId_externalId: { userId: U, externalId: 's1' } } });
  assert.equal(d.collectionId, c.id);
  const ev = await testDb.pointEvent.findFirstOrThrow({ where: { donationId: d.id } });
  assert.equal(ev.collectionId, c.id);
});

test('без активного збору collectionId = null (як раніше)', async () => {
  await applyDonation(testDb, U, { externalId: 'n1', donorName: 'Тарас', amountUah: 150, message: 'одеса' }, 'odesa');
  const d = await testDb.donation.findUniqueOrThrow({ where: { userId_externalId: { userId: U, externalId: 'n1' } } });
  assert.equal(d.collectionId, null);
});
