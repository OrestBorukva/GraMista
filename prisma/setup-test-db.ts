import 'dotenv/config';
import { execSync } from 'node:child_process';

// Готує тестову БД: скидає її начисто (дроп → усі міграції → сід) проти TEST_DATABASE_URL.
// Reset (а не deploy) — бо міграція акаунтів додає NOT NULL-колонки до User, що не лягають
// на наявні рядки; чистий reset надійніший. seed запускається автоматично (з package.json).
// База має існувати (одноразово: createdb gramista_test). DATABASE_URL передаємо
// через env дочірнього процесу — кросплатформно, без cross-env.
const url =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gramista:gramista@localhost:5435/gramista_test?schema=public';
const env = { ...process.env, DATABASE_URL: url };

console.log('[test-db] migrate reset →', url.replace(/:\/\/[^@]*@/, '://***@')); // креди не світимо
execSync('prisma migrate reset --force --skip-generate', { stdio: 'inherit', env });
