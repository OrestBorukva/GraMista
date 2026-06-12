import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';

// Node 18 не авто-знаходить *.ts тести, тож збираємо список самі й віддаємо
// перевіреному `tsx --test` (він коректно проганяє .ts у дочірніх процесах).
const files = readdirSync('test', { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => 'test/' + f.split('\\').join('/'));

if (files.length === 0) {
  console.error('Тестів не знайдено в test/');
  process.exit(1);
}

const testDbUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gramista:gramista@localhost:5435/gramista_test?schema=public';

// Тестова БД одна на машину, а прогонів може бути кілька одночасно (друге вікно,
// паралельна агент-сесія, осиротілий після Ctrl+C прогін — на Windows діти переживають
// вбивство батька). Два прогони, що чергують TRUNCATE і запис, валять один одного
// (FK violations, чужі рядки в топі). Тому на час прогону тримаємо advisory lock у
// самій БД: другий прогін чесно чекає своєї черги замість тихо ламати перший.
const LOCK_KEY = 'gramista-test-suite';
const LOCK_WAIT_MS = 5 * 60 * 1000;

async function main(): Promise<number> {
  const client = new Client({ connectionString: testDbUrl });
  client.on('error', (e: Error) => console.error('[test/run] помилка зʼєднання з тестовою БД:', e.message));
  await client.connect();
  try {
    const deadline = Date.now() + LOCK_WAIT_MS;
    let warned = false;
    for (;;) {
      const r = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS ok', [LOCK_KEY]);
      if (r.rows[0]?.ok) break;
      if (!warned) {
        console.error('Інший прогін тестів уже працює з gramista_test — чекаю своєї черги…');
        warned = true;
      }
      if (Date.now() > deadline) {
        console.error(
          `Не дочекався звільнення тестової БД за ${LOCK_WAIT_MS / 60000} хв. ` +
            'Ймовірно, висить чужий прогін (перевір процеси node з "--test").',
        );
        return 1;
      }
      await new Promise((res) => setTimeout(res, 1000));
    }

    // --test-concurrency=1: файли ділять одну тестову БД, тож виконуємо послідовно,
    // інакше truncate/запис одного файлу псує дані іншого (гонка між процесами).
    const res = spawnSync('tsx', ['--test', '--test-concurrency=1', ...files], { stdio: 'inherit', shell: true });
    return res.status ?? 1;
  } finally {
    // Замок сесійний — знімається сам із закриттям з'єднання.
    await client.end().catch(() => {});
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error('Не вдалося підготувати прогін тестів:', e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
