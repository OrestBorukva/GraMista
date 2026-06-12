import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { testDb } from './db';
import { subscribe, busActive } from '../lib/donationBus';

// Та сама тестова БД, що в test/db.ts (NOTIFY живе в межах однієї БД).
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gramista:gramista@localhost:5435/gramista_test?schema=public';
const OPTS = { connectionString: TEST_URL };

async function notify(payload: string): Promise<void> {
  await testDb.$executeRawUnsafe(`SELECT pg_notify('donation', '${payload}')`);
}

test('двоє підписників отримують той самий payload через ОДНЕ зʼєднання', async () => {
  const a: string[] = [];
  const b: string[] = [];
  let arrived: () => void = () => {};
  const both = new Promise<void>((res) => { arrived = res; });

  const offA = await subscribe((p) => { a.push(p); if (b.length) arrived(); }, OPTS);
  const offB = await subscribe((p) => { b.push(p); if (a.length) arrived(); }, OPTS);
  assert.equal(busActive(), true);

  await notify('u1:x1');
  await Promise.race([both, delay(2000).then(() => { throw new Error('не дочекались NOTIFY за 2с'); })]);
  assert.deepEqual(a, ['u1:x1']);
  assert.deepEqual(b, ['u1:x1']);

  // Відписка одного — другий далі отримує.
  await offA();
  assert.equal(busActive(), true);
  await notify('u1:x2');
  await delay(300);
  assert.deepEqual(a, ['u1:x1'], 'відписаний більше не отримує');
  assert.deepEqual(b, ['u1:x1', 'u1:x2']);

  // Останній відписався → зʼєднання закрите, нові NOTIFY не приходять.
  await offB();
  assert.equal(busActive(), false);
  await notify('u1:x3');
  await delay(300);
  assert.deepEqual(b, ['u1:x1', 'u1:x2']);
});

test('повторний виклик відписки — ідемпотентний; нова підписка після закриття знову працює', async () => {
  const got: string[] = [];
  let arrived: () => void = () => {};
  const first = new Promise<void>((res) => { arrived = res; });

  const off = await subscribe((p) => { got.push(p); arrived(); }, OPTS);
  await off();
  await off(); // не кидає
  assert.equal(busActive(), false);

  const off2 = await subscribe((p) => { got.push(p); arrived(); }, OPTS);
  await notify('u2:y1');
  await Promise.race([first, delay(2000).then(() => { throw new Error('не дочекались NOTIFY за 2с'); })]);
  assert.deepEqual(got, ['u2:y1']);
  await off2();
});
