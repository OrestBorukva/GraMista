import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { testDb, resetDynamic } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { applyDonation } from '../lib/scoring';
import { leaderboard } from '../lib/leaderboard';
import { overtakeMessage } from '../lib/overtake';

const U = DEFAULT_USER_ID;

beforeEach(async () => {
  await resetDynamic();
});

after(async () => {
  await testDb.$disconnect();
});

test('leaderboard: asc перевертає порядок (менші↔більші) — для перемикача топу на дашборді', async () => {
  await applyDonation(testDb, U, { externalId: 'l1', donorName: 'A', amountUah: 1000, message: 'Київ' }, 'kyiv'); // 10
  await applyDonation(testDb, U, { externalId: 'l2', donorName: 'B', amountUah: 500, message: 'Львів' }, 'lviv'); // 5
  await applyDonation(testDb, U, { externalId: 'l3', donorName: 'C', amountUah: 300, message: 'Одеса' }, 'odesa'); // 3

  const desc = await leaderboard(testDb, U); // дефолт — спадання
  assert.deepEqual(desc.map((r) => r.settlementId), ['kyiv', 'lviv', 'odesa']);

  const asc = await leaderboard(testDb, U, { asc: true });
  assert.deepEqual(asc.map((r) => r.settlementId), ['odesa', 'lviv', 'kyiv']);
});

test('leaderboard({collectionId}): лише події цього збору; без фільтра — все', async () => {
  const c = await testDb.collection.create({ data: { userId: U, name: 'С', status: 'active' } });
  await applyDonation(testDb, U, { externalId: 'l1', donorName: 'A', amountUah: 300, message: '' }, 'kyiv', null, { collectionId: c.id });
  await applyDonation(testDb, U, { externalId: 'l2', donorName: 'B', amountUah: 500, message: '' }, 'lviv', null, {}); // поза збором
  const inCol = await leaderboard(testDb, U, { collectionId: c.id, limit: 10 });
  assert.deepEqual(inCol.map((r) => r.settlementId), ['kyiv']);
  const all = await leaderboard(testDb, U, { limit: 10 });
  assert.equal(all.length, 2); // «весь час» бачить і поза збором
});

test('overtakeMessage: зміна лідера → «X обігнав Y»; без зміни/порожньо → null', () => {
  const before = [{ id: 'lviv', name: 'Львів' }, { id: 'kyiv', name: 'Київ' }];
  const after = [{ id: 'kyiv', name: 'Київ' }, { id: 'lviv', name: 'Львів' }];
  assert.equal(overtakeMessage(before, after), 'Київ обігнав Львів');
  assert.equal(overtakeMessage(before, before), null);
  assert.equal(overtakeMessage([], after), null);
});
