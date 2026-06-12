import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

import { testDb } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { setCityBattle } from '../lib/settings';

const U = DEFAULT_USER_ID;

beforeEach(async () => {
  // User не чиститься TRUNCATE — повертаємо тумблер у дефолт перед кожним тестом.
  await testDb.user.update({ where: { id: U }, data: { cityBattle: true } });
});

after(async () => {
  await testDb.$disconnect();
});

test('setCityBattle(false) вимикає битву міст і повертає новий стан', async () => {
  const res = await setCityBattle(testDb, U, false);
  assert.equal(res, false);

  const u = await testDb.user.findUnique({ where: { id: U }, select: { cityBattle: true } });
  assert.equal(u?.cityBattle, false);
});

test('setCityBattle(true) вмикає назад', async () => {
  await setCityBattle(testDb, U, false);
  const res = await setCityBattle(testDb, U, true);
  assert.equal(res, true);

  const u = await testDb.user.findUnique({ where: { id: U }, select: { cityBattle: true } });
  assert.equal(u?.cityBattle, true);
});
