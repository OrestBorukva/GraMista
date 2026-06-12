import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { testDb, resetDynamic } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { applyDonation } from '../lib/scoring';
import { leaderboard } from '../lib/leaderboard';
import { reassignCity } from '../lib/admin';

const U = DEFAULT_USER_ID;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const top = (rows: { settlementId: string; points: number }[]): [string, number][] =>
  rows
    .map((r) => [r.settlementId, r4(r.points)] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

const poolOf = async (donor: string, city: string): Promise<number> => {
  const p = await testDb.donorCityPool.findFirst({
    where: { userId: U, donorKey: donor, settlementId: city },
  });
  return p?.accumulatedAmount.toNumber() ?? 0;
};

// Базовий час для детермінованого порядку replay (replay сортує за createdAt, id).
const BASE = new Date('2026-01-01T00:00:00Z').getTime();
let clock = 0;

beforeEach(async () => {
  await resetDynamic();
  clock = 0;
});

after(async () => {
  await testDb.$disconnect();
});

/** Застосувати донат і виставити детермінований createdAt (зростає з кожним викликом). */
async function donate(externalId: string, donor: string, amount: number, city: string | null, streamId: string | null = null) {
  await applyDonation(testDb, U, { externalId, donorName: donor, amountUah: amount, message: city ?? '' }, city, streamId);
  clock += 1000;
  await testDb.donation.update({
    where: { userId_externalId: { userId: U, externalId } },
    data: { createdAt: new Date(BASE + clock) },
  });
}

const points = async (externalId: string): Promise<number> => {
  const d = await testDb.donation.findUniqueOrThrow({ where: { userId_externalId: { userId: U, externalId } } });
  return r4(d.pointsAwarded.toNumber());
};
const cityOf = async (externalId: string): Promise<string | null> => {
  const d = await testDb.donation.findUniqueOrThrow({ where: { userId_externalId: { userId: U, externalId } } });
  return d.settlementId;
};

test('reassignCity: переносить бали понад-порогового донату в нове місто (kyiv→lviv)', async () => {
  await donate('d1', 'Анна', 500, 'kyiv'); // 500 ≥ 100 → flush 5 балів у kyiv

  const res = await reassignCity(testDb, U, 'd1', 'lviv');
  assert.deepEqual([res?.ok, r4(res?.points ?? -1)], [true, 5]);

  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['lviv', 5]]); // kyiv зник
  assert.equal(await cityOf('d1'), 'lviv');
  assert.equal(await points('d1'), 5);
  assert.equal(await poolOf('Анна', 'kyiv'), 0); // пул старого міста прибрано
});

test('reassignCity: валідація — null для неіснуючого/нерозпізнаного/того самого/неіснуючого міста', async () => {
  await donate('rec', 'Анна', 500, 'kyiv');
  await donate('unrec', 'Борис', 200, null); // нерозпізнаний

  assert.equal(await reassignCity(testDb, U, 'NOPE', 'lviv'), null); // нема донату
  assert.equal(await reassignCity(testDb, U, 'unrec', 'lviv'), null); // нерозпізнаний — це робота assignCity
  assert.equal(await reassignCity(testDb, U, 'rec', 'kyiv'), null); // те саме місто
  assert.equal(await reassignCity(testDb, U, 'rec', 'atlantis'), null); // нема такого міста

  // нічого не зламалось
  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['kyiv', 5]]);
});

test('reassignCity: винесення донату з пулу може опустити старе місто НИЖЧЕ порога (поріг перераховується)', async () => {
  // Анна: 60 + 60 у kyiv → на другому пул 120 ≥ 100 → flush 1.2 бала
  await donate('d1', 'Анна', 60, 'kyiv'); // pending 60
  await donate('d2', 'Анна', 60, 'kyiv'); // flush 120 → 1.2

  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['kyiv', 1.2]]);

  // Переносимо d1 у lviv → kyiv лишається лише d2 (60, pending), lviv отримує d1 (60, pending)
  const res = await reassignCity(testDb, U, 'd1', 'lviv');
  assert.equal(res?.ok, true);

  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), []); // обидва міста нижче порога → 0 балів
  assert.equal(await poolOf('Анна', 'kyiv'), 60);
  assert.equal(await poolOf('Анна', 'lviv'), 60);
  assert.equal(await points('d1'), 0);
  assert.equal(await points('d2'), 0);
  // гроші збережено: сума пулів = 120 (нічого не загублено)
});

test('reassignCity: перенос у місто з накопиченим пулом ПЕРЕТИНАЄ поріг (створює flush)', async () => {
  await donate('d1', 'Анна', 60, 'lviv'); // lviv pending 60
  await donate('d2', 'Анна', 60, 'kyiv'); // kyiv pending 60

  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), []); // обидва нижче порога

  // d2 (kyiv) → lviv: lviv тепер 60+60=120 ≥ 100 → flush 1.2
  const res = await reassignCity(testDb, U, 'd2', 'lviv');
  assert.equal(res?.ok, true);

  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['lviv', 1.2]]);
  assert.equal(await poolOf('Анна', 'kyiv'), 0); // kyiv спорожнів
  assert.equal(await poolOf('Анна', 'lviv'), 0); // flush обнулив пул
});

test('reassignCity: КРОС-ПЕРЕВІРКА — результат тотожний свіжому застосуванню донатів у фінальні міста', async () => {
  // Сценарій із reassign: d1=150→kyiv, d2=80→kyiv, d3=200→lviv; потім d2 kyiv→lviv.
  await donate('d1', 'Анна', 150, 'kyiv'); // kyiv flush 1.5
  await donate('d2', 'Анна', 80, 'kyiv'); // kyiv pending 80
  await donate('d3', 'Анна', 200, 'lviv'); // lviv flush 2.0
  await reassignCity(testDb, U, 'd2', 'lviv');

  const afterReassign = top(await leaderboard(testDb, U, { limit: 50 }));
  const poolsReassign = [await poolOf('Анна', 'kyiv'), await poolOf('Анна', 'lviv')];

  // Свіжий сценарій (та сама БД, скинута): ті самі донати ОДРАЗУ у фінальні міста,
  // у тому ж хронологічному порядку (d1<d2<d3).
  await resetDynamic();
  clock = 0;
  await donate('f1', 'Анна', 150, 'kyiv');
  await donate('f2', 'Анна', 80, 'lviv');
  await donate('f3', 'Анна', 200, 'lviv');

  const fresh = top(await leaderboard(testDb, U, { limit: 50 }));
  const poolsFresh = [await poolOf('Анна', 'kyiv'), await poolOf('Анна', 'lviv')];

  assert.deepEqual(afterReassign, fresh); // топи тотожні
  assert.deepEqual(poolsReassign, poolsFresh); // пули тотожні
  // конкретні очікувані значення: kyiv=1.5, lviv = (80 pending, +200 → 280 ≥100 → 2.8)
  assert.deepEqual(fresh, [['kyiv', 1.5], ['lviv', 2.8]]);
});

test('reassignCity: інші донатери того ж міста не зачіпаються', async () => {
  await donate('a', 'Анна', 150, 'kyiv'); // Анна kyiv 1.5
  await donate('b', 'Борис', 200, 'kyiv'); // Борис kyiv 2.0

  await reassignCity(testDb, U, 'a', 'lviv'); // переносимо лише донат Анни

  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['kyiv', 2], ['lviv', 1.5]]);
  assert.equal(await poolOf('Борис', 'kyiv'), 0); // Борис flush, пул 0 — недоторканий
});

test('reassignCity: stream-атрибуція балів переїжджає разом із донатом', async () => {
  const s = await testDb.stream.create({ data: { userId: U, name: 'Ефір', startedAt: new Date() } });
  await donate('d1', 'Анна', 500, 'kyiv', s.id); // 5 балів у стрімі s, місто kyiv

  await reassignCity(testDb, U, 'd1', 'lviv');

  // У межах стріму s бали тепер у lviv, не в kyiv
  assert.deepEqual(top(await leaderboard(testDb, U, { streamIds: [s.id], limit: 50 })), [['lviv', 5]]);
});
