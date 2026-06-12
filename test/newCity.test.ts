import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { testDb, resetDynamic } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { applyDonation } from '../lib/scoring';
import { reassignCity } from '../lib/admin';
import { cityOpeners, openerKey } from '../lib/newCity';
import { getState } from '../lib/dashboard';
import { donationFlash } from '../lib/map';

const U = DEFAULT_USER_ID;

async function donationId(externalId: string): Promise<string> {
  const d = await testDb.donation.findUniqueOrThrow({
    where: { userId_externalId: { userId: U, externalId } },
  });
  return d.id;
}

beforeEach(async () => {
  await resetDynamic();
});

after(async () => {
  await testDb.$disconnect();
});

test('відкривач — донат, що перетнув поріг 100₴, а не перший маленький', async () => {
  await applyDonation(testDb, U, { externalId: 'n1', donorName: 'Оля', amountUah: 60, message: 'Львів' }, 'lviv', null);
  await applyDonation(testDb, U, { externalId: 'n2', donorName: 'Оля', amountUah: 50, message: 'Львів' }, 'lviv', null);
  const openers = await cityOpeners(testDb, U, [{ settlementId: 'lviv', collectionId: null }]);
  assert.equal(openers.get(openerKey('lviv', null)), await donationId('n2'));
});

test('місто без жодного PointEvent — відсутнє в мапі відповіді', async () => {
  await applyDonation(testDb, U, { externalId: 'n3', donorName: 'Іван', amountUah: 40, message: 'Київ' }, 'kyiv', null);
  const openers = await cityOpeners(testDb, U, [{ settlementId: 'kyiv', collectionId: null }]);
  assert.equal(openers.has(openerKey('kyiv', null)), false);
});

test('per-collection: те саме місто в новому зборі — знову має відкривача', async () => {
  const a = await testDb.collection.create({ data: { userId: U, name: 'А', status: 'completed' } });
  const b = await testDb.collection.create({ data: { userId: U, name: 'Б', status: 'active' } });
  await applyDonation(testDb, U, { externalId: 'c1', donorName: 'Іван', amountUah: 150, message: 'Київ' }, 'kyiv', null, { collectionId: a.id });
  await applyDonation(testDb, U, { externalId: 'c2', donorName: 'Оля', amountUah: 200, message: 'Київ' }, 'kyiv', null, { collectionId: b.id });
  const openers = await cityOpeners(testDb, U, [
    { settlementId: 'kyiv', collectionId: a.id },
    { settlementId: 'kyiv', collectionId: b.id },
  ]);
  assert.equal(openers.get(openerKey('kyiv', a.id)), await donationId('c1'));
  assert.equal(openers.get(openerKey('kyiv', b.id)), await donationId('c2'));
});

test('перший бал від адміна (без donationId) — відкривача-донату нема (null)', async () => {
  await testDb.pointEvent.create({
    data: { userId: U, settlementId: 'kyiv', points: 1, source: 'admin' },
  });
  await applyDonation(testDb, U, { externalId: 'a1', donorName: 'Іван', amountUah: 150, message: 'Київ' }, 'kyiv', null);
  const openers = await cityOpeners(testDb, U, [{ settlementId: 'kyiv', collectionId: null }]);
  assert.equal(openers.get(openerKey('kyiv', null)), null);
});

test('reassignCity: статус відкривача самовиправляється в обох містах', async () => {
  await applyDonation(testDb, U, { externalId: 'r1', donorName: 'Іван', amountUah: 150, message: 'Київ' }, 'kyiv', null);
  await applyDonation(testDb, U, { externalId: 'r2', donorName: 'Оля', amountUah: 200, message: 'Київ' }, 'kyiv', null);
  await reassignCity(testDb, U, 'r1', 'lviv');
  const openers = await cityOpeners(testDb, U, [
    { settlementId: 'kyiv', collectionId: null },
    { settlementId: 'lviv', collectionId: null },
  ]);
  // r1 поїхав до Львова → Львів відкрив r1; у Києві найпершим лишився r2.
  assert.equal(openers.get(openerKey('lviv', null)), await donationId('r1'));
  assert.equal(openers.get(openerKey('kyiv', null)), await donationId('r2'));
});

test('tiebreak: однаковий createdAt → виграє менший id (детерміновано)', async () => {
  await applyDonation(testDb, U, { externalId: 't1', donorName: 'Іван', amountUah: 150, message: 'Київ' }, 'kyiv', null);
  await applyDonation(testDb, U, { externalId: 't2', donorName: 'Оля', amountUah: 150, message: 'Київ' }, 'kyiv', null);
  const at = new Date('2026-01-01T00:00:00Z');
  await testDb.pointEvent.updateMany({ where: { userId: U, settlementId: 'kyiv' }, data: { createdAt: at } });
  const evs = await testDb.pointEvent.findMany({
    where: { userId: U, settlementId: 'kyiv' },
    orderBy: { id: 'asc' },
  });
  const openers = await cityOpeners(testDb, U, [{ settlementId: 'kyiv', collectionId: null }]);
  assert.equal(openers.get(openerKey('kyiv', null)), evs[0]?.donationId);
});

test('getState: newCity позначає саме рядок-відкривач у стрічці', async () => {
  await applyDonation(testDb, U, { externalId: 'g1', donorName: 'Оля', amountUah: 60, message: 'Львів' }, 'lviv', null);
  await applyDonation(testDb, U, { externalId: 'g2', donorName: 'Оля', amountUah: 50, message: 'Львів' }, 'lviv', null);
  await applyDonation(testDb, U, { externalId: 'g3', donorName: 'Іван', amountUah: 200, message: 'Львів' }, 'lviv', null);
  const state = await getState(testDb, U);
  const byId = new Map(state.recent.map((r) => [r.externalId, r.newCity]));
  assert.deepEqual(
    [byId.get('g1'), byId.get('g2'), byId.get('g3')],
    [false, true, false],
  );
});

test('donationFlash: newCity true лише для відкривача', async () => {
  await applyDonation(testDb, U, { externalId: 'f1', donorName: 'Оля', amountUah: 150, message: 'Львів' }, 'lviv', null);
  await applyDonation(testDb, U, { externalId: 'f2', donorName: 'Іван', amountUah: 200, message: 'Львів' }, 'lviv', null);
  const a = await donationFlash(testDb, U, 'f1');
  const b = await donationFlash(testDb, U, 'f2');
  assert.equal(a?.newCity, true);
  assert.equal(b?.newCity, false);
});
