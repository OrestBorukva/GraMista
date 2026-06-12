import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { testDb, resetDynamic } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { applyDonation } from '../lib/scoring';
import { bucketCumulative, cityRaceSeries } from '../lib/race';

const U = DEFAULT_USER_ID;
const D0 = new Date('2026-06-01T00:00:00');
const at = (day: number, h = 12) => new Date(2026, 5, 1 + day, h);

beforeEach(async () => {
  await resetDynamic();
});

after(async () => {
  await testDb.$disconnect();
});

test('bucketCumulative: кумулятив по днях, події поза вікном ігноруються', () => {
  const out = bucketCumulative(
    [
      { at: at(0), points: 2 },
      { at: at(2), points: 3 },
      { at: at(2, 23), points: 1 },
      { at: new Date('2026-05-31T23:59:59'), points: 100 }, // до вікна
      { at: at(7), points: 100 }, // після вікна (днів 5)
    ],
    D0,
    5,
  );
  assert.deepEqual(out, [2, 2, 6, 6, 6]);
});

test('bucketCumulative: порожньо → нулі; дробові бали округлюються до 0.1', () => {
  assert.deepEqual(bucketCumulative([], D0, 3), [0, 0, 0]);
  const out = bucketCumulative(
    [
      { at: at(0), points: 0.1 },
      { at: at(1), points: 0.2 },
    ],
    D0,
    2,
  );
  assert.deepEqual(out, [0.1, 0.3]);
});

test('cityRaceSeries({collectionId}): події поза збором не псують серію', async () => {
  const c = await testDb.collection.create({ data: { userId: U, name: 'С', status: 'active' } });
  await applyDonation(testDb, U, { externalId: 'r1', donorName: 'A', amountUah: 300, message: '' }, 'kyiv', null, { collectionId: c.id });
  await applyDonation(testDb, U, { externalId: 'r2', donorName: 'B', amountUah: 500, message: '' }, 'kyiv'); // поза збором
  const data = await cityRaceSeries(testDb, U, { collectionId: c.id });
  const kyiv = data.series.find((s) => s.settlementId === 'kyiv');
  assert.ok(kyiv);
  assert.equal(kyiv!.cumulative.at(-1), 3); // лише 300₴ = 3 бали в межах збору (500 поза збором не входить)
});
