import { PrismaClient } from '@prisma/client';

// Тестова БД (gramista_test). Налаштування — npm run db:test:setup.
// Креди локального docker — не секрет; за потреби перевизначити TEST_DATABASE_URL.
const url =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gramista:gramista@localhost:5435/gramista_test?schema=public';

export const testDb = new PrismaClient({ datasourceUrl: url });

/** Чистить лише динамічні таблиці; довідник (User, Settlement, SettlementAlias) лишається. */
export async function resetDynamic(): Promise<void> {
  await testDb.$executeRawUnsafe(
    'TRUNCATE TABLE "PointEvent","Donation","DonorCityPool","Stream","Collection","AdminAction" RESTART IDENTITY CASCADE',
  );
}
