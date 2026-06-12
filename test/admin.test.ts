import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { testDb, resetDynamic } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { applyDonation } from '../lib/scoring';
import { leaderboard } from '../lib/leaderboard';
import { getUnrecognized, assignCity, assignCityBulk, adjustPoints, resetCity, resetAll } from '../lib/admin';
import { mapPoints } from '../lib/map';
import { getState } from '../lib/dashboard';
import { startStream } from '../lib/streams';

const U = DEFAULT_USER_ID;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const top = (rows: { settlementId: string; points: number }[]): [string, number][] =>
  rows
    .map((r) => [r.settlementId, r4(r.points)] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

beforeEach(async () => {
  await resetDynamic();
});

after(async () => {
  await testDb.$disconnect();
});

test('getUnrecognized повертає нерозпізнані донати з анонімізованим іменем', async () => {
  await applyDonation(testDb, U, { externalId: 'X1', donorName: 'Анна Коваль', amountUah: 150, message: 'хтозна' }, null);
  const list = await getUnrecognized(testDb, U);
  assert.equal(list.total, 1);
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0]!.externalId, 'X1');
  assert.equal(list.items[0]!.who, 'Анна К.');
  assert.equal(list.items[0]!.amountUah, 150);
});

test('getUnrecognized: пошук (за іменем/повідомленням) + пагінація (skip/limit, total)', async () => {
  await applyDonation(testDb, U, { externalId: 'u1', donorName: 'Анна Коваль', amountUah: 100, message: 'привіт' }, null);
  await applyDonation(testDb, U, { externalId: 'u2', donorName: 'Богдан Лис', amountUah: 100, message: 'слава' }, null);
  await applyDonation(testDb, U, { externalId: 'u3', donorName: 'Віктор Сало', amountUah: 100, message: 'Анна тут' }, null);

  const byName = await getUnrecognized(testDb, U, { search: 'богдан' });
  assert.equal(byName.total, 1);
  assert.equal(byName.items[0]?.externalId, 'u2');

  // «анна» — у u1 (ім'я) і u3 (повідомлення)
  const byMsg = await getUnrecognized(testDb, U, { search: 'анна' });
  assert.equal(byMsg.total, 2);
  assert.deepEqual(byMsg.items.map((i) => i.externalId).sort(), ['u1', 'u3']);

  const p1 = await getUnrecognized(testDb, U, { limit: 2 });
  assert.equal(p1.total, 3);
  assert.equal(p1.items.length, 2);
  const p2 = await getUnrecognized(testDb, U, { limit: 2, skip: 2 });
  assert.equal(p2.items.length, 1);
});

test('assignCityBulk: призначає місто кільком нерозпізнаним, рахує успішні', async () => {
  await applyDonation(testDb, U, { externalId: 'b1', donorName: 'A', amountUah: 200, message: 'хз' }, null);
  await applyDonation(testDb, U, { externalId: 'b2', donorName: 'B', amountUah: 300, message: 'хз' }, null);

  const n = await assignCityBulk(testDb, U, ['b1', 'b2', 'nope'], 'kyiv');
  assert.equal(n, 2); // b1,b2 призначені; неіснуючий — ні
  assert.equal((await getUnrecognized(testDb, U)).total, 0); // обидва тепер recognized
});

test('assignCity нараховує бали (поріг+скарбничка) і не дублює при повторі', async () => {
  await applyDonation(testDb, U, { externalId: 'X1', donorName: 'Анна Коваль', amountUah: 150, message: 'хтозна' }, null);

  const res = await assignCity(testDb, U, 'X1', 'kyiv');
  assert.deepEqual([res?.ok, r4(res?.points ?? -1)], [true, 1.5]);
  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['kyiv', 1.5]]);

  // повторне призначення вже розпізнаного — null, без подвійних балів
  assert.equal(await assignCity(testDb, U, 'X1', 'kyiv'), null);
  assert.equal(await assignCity(testDb, U, 'NOPE', 'kyiv'), null);
  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['kyiv', 1.5]]);
});

test('assignCity на неіснуюче місто — null', async () => {
  await applyDonation(testDb, U, { externalId: 'X1', donorName: 'Тест', amountUah: 150, message: '' }, null);
  assert.equal(await assignCity(testDb, U, 'X1', 'atlantis'), null);
});

test('adjustPoints додає/віднімає бали; валідація відхиляє хибне', async () => {
  assert.equal(await adjustPoints(testDb, U, 'lviv', 5), true);
  assert.equal(await adjustPoints(testDb, U, 'lviv', -2), true);
  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['lviv', 3]]);

  assert.equal(await adjustPoints(testDb, U, 'atlantis', 5), false);
  assert.equal(await adjustPoints(testDb, U, 'lviv', 0), false);
  assert.equal(await adjustPoints(testDb, U, 'lviv', Number.NaN), false);
});

test('resetCity чистить бали й скарбничку одного міста; решта лишається', async () => {
  await applyDonation(testDb, U, { externalId: 'X1', donorName: 'А', amountUah: 150, message: 'Київ' }, 'kyiv');
  await adjustPoints(testDb, U, 'lviv', 3);
  await applyDonation(testDb, U, { externalId: 'X2', donorName: 'Б', amountUah: 50, message: 'Київ' }, 'kyiv'); // пул kyiv

  await resetCity(testDb, U, 'kyiv');
  assert.deepEqual(top(await leaderboard(testDb, U, { limit: 50 })), [['lviv', 3]]);
  const pools = await testDb.donorCityPool.count({ where: { userId: U, settlementId: 'kyiv' } });
  assert.equal(pools, 0);
});

test('resetAll чистить всі бали й скарбнички; донати лишаються', async () => {
  await applyDonation(testDb, U, { externalId: 'X1', donorName: 'А', amountUah: 150, message: 'Київ' }, 'kyiv');
  await adjustPoints(testDb, U, 'lviv', 3);

  await resetAll(testDb, U);
  assert.deepEqual(await leaderboard(testDb, U, { limit: 50 }), []);
  assert.equal(await testDb.pointEvent.count({ where: { userId: U } }), 0);
  assert.equal(await testDb.donorCityPool.count({ where: { userId: U } }), 0);
  assert.ok((await testDb.donation.count({ where: { userId: U } })) > 0); // історія донатів збережена
});

test('mapPoints — лише міста з балами, з координатами', async () => {
  await applyDonation(testDb, U, { externalId: 'X1', donorName: 'А', amountUah: 150, message: 'Київ' }, 'kyiv'); // 1.5
  await adjustPoints(testDb, U, 'lviv', 3);
  await applyDonation(testDb, U, { externalId: 'X2', donorName: 'Б', amountUah: 50, message: 'Одеса' }, 'odesa'); // пул, 0 балів

  const pts = await mapPoints(testDb, U);
  const byId = new Map(pts.map((p) => [p.id, p]));
  assert.deepEqual([...byId.keys()].sort(), ['kyiv', 'lviv']); // odesa без балів — нема
  assert.equal(r4(byId.get('kyiv')!.points), 1.5);
  assert.equal(typeof byId.get('kyiv')!.lat, 'number');
});

test('getState: загальна сума («гаманець») = всі донати, з містом і без', async () => {
  await applyDonation(testDb, U, { externalId: 'm1', donorName: 'А', amountUah: 150, message: 'Київ' }, 'kyiv'); // гроші + бали
  await applyDonation(testDb, U, { externalId: 'm2', donorName: 'Б', amountUah: 500, message: 'дякую' }, null); // лише гроші

  const s = await getState(testDb, U);
  assert.equal(s.totalRaisedUah, 650);
});

test('getState: активний стрім, топ, стрічка (анонімно), мапа', async () => {
  await startStream(testDb, U, 'Ефір');
  await applyDonation(testDb, U, { externalId: 'X1', donorName: 'Анна Коваль', amountUah: 150, message: 'Київ' }, 'kyiv');

  const s = await getState(testDb, U);
  assert.ok(s.activeStream);
  assert.equal(s.activeStream!.name, 'Ефір');
  assert.deepEqual(top(s.leaderboard), [['kyiv', 1.5]]);
  assert.equal(s.recent[0]!.who, 'Анна К.');
  assert.equal(s.recent[0]!.city, 'Київ');
  assert.equal(s.map.length, 1);
});
