import { test, after } from 'node:test';
import assert from 'node:assert/strict';

import { testDb } from './db';
import { DEFAULT_USER_ID } from '../lib/tenant';
import { searchSettlements, addAlias } from '../lib/settlements';
import { resolveCity } from '../lib/cityResolve';

const U = DEFAULT_USER_ID;

// Довідник (Settlement/SettlementAlias) seed-иться раз (db:test:setup) і не чиститься
// resetDynamic — тож тест читає реальні seed-дані. Ручні аліаси прибираємо самі.

async function cleanManualAliases(): Promise<void> {
  await testDb.settlementAlias.deleteMany({ where: { source: 'manual' } });
}

after(async () => {
  await testDb.$disconnect();
});

test('searchSettlements: за назвою, за аліасом, мін. довжина, ліміт', async () => {
  const byName = await searchSettlements(testDb, 'льві');
  assert.ok(byName.some((s) => s.name === 'Львів'), 'знайти за назвою');

  const byAlias = await searchSettlements(testDb, 'lvov');
  assert.ok(byAlias.some((s) => s.name === 'Львів'), 'знайти за аліасом (транслітерація)');

  assert.deepEqual(await searchSettlements(testDb, 'л'), [], 'надто короткий запит → порожньо');

  const limited = await searchSettlements(testDb, 'ів', 1);
  assert.ok(limited.length <= 1, 'ліміт дотримано');
});

test('addAlias: manual-аліас зберігається; його бачать searchSettlements і resolveCity; дедуп', async () => {
  await cleanManualAliases();
  try {
    const res = await addAlias(testDb, U, 'kyiv', 'Мегаполіс');
    assert.ok(res?.ok);
    assert.equal(res.aliasNorm, 'мегаполіс');

    // пошук в Адмінці бачить за новим аліасом
    const found = await searchSettlements(testDb, 'мегаполіс');
    assert.ok(found.some((s) => s.id === 'kyiv'), 'searchSettlements бачить аліас');

    // авто-розпізнавання (resolveCity) теж бачить
    const m = await resolveCity(testDb, 'привіт з мегаполіс друзі');
    assert.equal(m?.settlementId, 'kyiv', 'resolveCity бачить аліас');

    // дедуп — повторне додавання не створює другий запис
    await addAlias(testDb, U, 'kyiv', 'мегаполіс');
    const count = await testDb.settlementAlias.count({ where: { settlementId: 'kyiv', aliasNorm: 'мегаполіс' } });
    assert.equal(count, 1, 'без дублів');
  } finally {
    await cleanManualAliases();
  }
});

test('addAlias: неіснуюче місто або закороткий аліас → null', async () => {
  assert.equal(await addAlias(testDb, U, 'nope-city', 'Тест'), null);
  assert.equal(await addAlias(testDb, U, 'kyiv', 'a'), null); // < 2 символів після нормалізації
});

test('searchSettlements v2: префікс перемагає, одруки ловляться, район повертається', async () => {
  // префікс: «терн» → Тернопіль першим (найбільше населення серед префіксних)
  const pre = await searchSettlements(testDb, 'терн');
  assert.equal(pre[0]?.name, 'Тернопіль');
  assert.ok('raion' in (pre[0] ?? {}), 'у відповіді є район');

  // одрук: «полтва» → Полтава (trgm-схожість)
  const fuzzy = await searchSettlements(testDb, 'полтва');
  assert.equal(fuzzy[0]?.name, 'Полтава');

  // тезки відрізняються районом: тимчасова фікстура
  await testDb.settlement.create({
    data: { id: 'tmp-ss-1', name: 'Тестове', nameNorm: 'тестове', oblast: 'Сумська', raion: 'Конотопський район', population: 10 },
  });
  try {
    const hit = await searchSettlements(testDb, 'тестове');
    assert.equal(hit[0]?.raion, 'Конотопський район');
  } finally {
    await testDb.settlement.deleteMany({ where: { id: 'tmp-ss-1' } });
  }
});
