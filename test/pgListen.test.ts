import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { testDb } from './db';
import { listen } from '../lib/pgListen';

// Окреме з'єднання слухача — на ту саму тестову БД, що й testDb (NOTIFY доставляється
// лише в межах однієї БД). Без переоприділення — той самий дефолт, що в test/db.ts.
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gramista:gramista@localhost:5435/gramista_test?schema=public';

test('listen отримує payload з pg_notify і коректно відписується', async () => {
  const received: string[] = [];
  let resolveFirst: () => void = () => {};
  const firstArrived = new Promise<void>((res) => {
    resolveFirst = res;
  });

  const unlisten = await listen(
    'gramista_test_chan',
    (p) => {
      received.push(p);
      resolveFirst();
    },
    { connectionString: TEST_URL },
  );

  try {
    await testDb.$executeRawUnsafe(`SELECT pg_notify('gramista_test_chan', 'hello')`);
    // NOTIFY доставляється асинхронно — чекаємо на прихід (із запобіжником від зависання).
    await Promise.race([
      firstArrived,
      delay(2000).then(() => {
        throw new Error('не дочекались NOTIFY за 2с');
      }),
    ]);

    assert.deepEqual(received, ['hello']);
  } finally {
    await unlisten();
  }

  // Після відписки нові NOTIFY не мають доходити (з'єднання закрите — доказ, що не тече).
  await testDb.$executeRawUnsafe(`SELECT pg_notify('gramista_test_chan', 'after')`);
  await delay(300);
  assert.deepEqual(received, ['hello'], 'після unlisten нічого не має приходити');
});

test('listen відхиляє небезпечну назву каналу (LISTEN не параметризується)', async () => {
  await assert.rejects(
    () => listen('bad; DROP TABLE', () => {}, { connectionString: TEST_URL }),
    /назв/i,
  );
});
