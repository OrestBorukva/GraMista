import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { applyDonation } from '../lib/scoring';
import { auth } from '../lib/auth';
import { ensureOverlayKey } from '../lib/publicUser';
import { webcrypto } from 'node:crypto';

// Node 18 не має глобального Web Crypto, який Better Auth вимагає (generateId). У рантаймі
// Next його надає сам; у tsx-скрипті поліфілимо перед створенням dev-акаунта.
const g = globalThis as unknown as { crypto?: Crypto };
if (!g.crypto) g.crypto = webcrypto as unknown as Crypto;

// DEV-ONLY: наповнює dev-БД зразковими донатами, щоб бачити панель живою.
// НЕ для проду. Ідемпотентний: чистить динаміку користувача й заливає заново.

// Запобіжник: скрипт створює джерело з вгадуваним webhookSecret 'devsecret' —
// на проді це відкрило б інжекцію фейкових донатів. Працюємо лише з локальною БД.
const dbHost = (() => {
  try { return new URL(process.env.DATABASE_URL ?? '').hostname; } catch { return ''; }
})();
if (!['localhost', '127.0.0.1'].includes(dbHost) || process.env.NODE_ENV === 'production') {
  console.error(`[demo] СТОП: demo-seed лише для локальної dev-БД (DATABASE_URL вказує на «${dbHost || 'невідомо'}»).`);
  process.exit(1);
}

const prisma = new PrismaClient();

// [ім'я, сума ₴, settlementId | null, daysAgo?] — daysAgo розкидає донати в часі,
// щоб перемикач періоду (Тиждень/Місяць/Весь час) було видно в демо. 0 = сьогодні.
// NB: «Тиждень» = останні 7 днів, «Місяць» = від 1-го числа поточного місяця (lib/period),
// тож на початку місяця ці два вікна майже збігаються — це очікувано, не баг.
const DONATIONS: [string, number, string | null, number?][] = [
  // останні кілька днів — топ-міста завжди на видноті (у «Тиждень»/«Місяць»)
  ['Катерина Бондаренко', 1000, 'lviv', 1],
  ['Мирослав Заглада', 250, 'lviv', 0],
  ['Олена Ткаченко', 900, 'kyiv', 2],
  ['Юлія Сорока', 520, 'odesa', 3],
  ['Ірина Мельник', 300, 'kharkiv', 5],
  // 2–4 тижні тому
  ['Наталя Павленко', 240, 'dnipro', 12],
  ['Віктор Дорош', 200, 'zaporizhzhia', 15],
  ['Софія Вакуленко', 180, 'vinnytsia', 18],
  ['Андрій Коваль', 150, 'ternopil', 22],
  ['Павло Гнатюк', 120, 'ivano-frankivsk', 26],
  // 1.5–4 місяці тому — лише у «Весь час»
  ['Дмитро Роменко', 100, 'poltava', 45],
  ['Олег Шевчук', 130, 'chernivtsi', 50],
  ['Тарас Бойко', 110, 'lutsk', 55],
  ['Ганна Левченко', 160, 'rivne', 60],
  ['Богдан Марчук', 140, 'zhytomyr', 65],
  ['Лідія Гончар', 120, 'sumy', 70],
  ['Роман Ткач', 170, 'khmelnytskyi', 80],
  ['Світлана Дяченко', 110, 'chernihiv', 90],
  ['Назар Поліщук', 130, 'uzhhorod', 100],
  ['Марія Савчук', 150, 'mykolaiv', 110],
  // скарбничка (< 100 грн → без балів)
  ['Артем Носко', 50, 'odesa', 3],
  ['Юрій Кравець', 70, 'kyiv', 2],
  // нерозпізнані (без міста)
  ['Богдан Лис', 75, null, 0],
  ['Іван Петренко', 200, null, 1],
];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const daysAgoDate = (n: number) => new Date(Date.now() - n * DAY_MS);
// Стрім триває кілька годин і завершився endDaysAgo днів тому (донати лінкуються за streamId,
// тож їх createdAt може лежати поза цим вікном — підсумки стріму це не ламає).
const streamWindow = (endDaysAgo: number, hours: number) => {
  const endedAt = daysAgoDate(endDaysAgo);
  return { startedAt: new Date(endedAt.getTime() - hours * HOUR_MS), endedAt };
};

const DEV_EMAIL = 'dev@gramista.local';
const DEV_PASSWORD = 'devpass123';

// Створює (раз) або знаходить dev-акаунт Better Auth і повертає його id. Логін для панелі:
// dev@gramista.local / devpass123. Демо наповнюється саме під цей акаунт (а не 'default',
// який лишається для тестів). Додає демо-джерело monobank для локального вебхука.
async function ensureDevUser(): Promise<string> {
  let user = await prisma.user.findUnique({ where: { email: DEV_EMAIL }, select: { id: true } });
  if (!user) {
    await auth.api.signUpEmail({ body: { email: DEV_EMAIL, password: DEV_PASSWORD, name: 'Dev' } });
    user = await prisma.user.findUniqueOrThrow({ where: { email: DEV_EMAIL }, select: { id: true } });
  }
  await prisma.user.update({ where: { id: user.id }, data: { handle: 'dev', emailVerified: true } });
  await ensureOverlayKey(prisma, user.id);
  // Демо-джерело monobank: дозволяє ганяти вебхук локально через curl на devsecret.
  await prisma.donationSource.upsert({
    where: { webhookSecret: 'devsecret' },
    update: {},
    create: { userId: user.id, type: 'monobank', monoAccountId: 'demo-jar', webhookSecret: 'devsecret', title: 'Демо-банка', status: 'active' },
  });
  return user.id;
}

async function main(): Promise<void> {
  const U = await ensureDevUser();

  // Чистимо всю динаміку користувача (стріми, збори) — щоб seed був ідемпотентним.
  await prisma.$transaction([
    prisma.pointEvent.deleteMany({ where: { userId: U } }),
    prisma.donation.deleteMany({ where: { userId: U } }),
    prisma.donorCityPool.deleteMany({ where: { userId: U } }),
    prisma.stream.deleteMany({ where: { userId: U } }),
    prisma.collection.deleteMany({ where: { userId: U } }),
  ]);

  // Три завершені стріми, щоб вкладка «Стріми» була наповнена (за періодами донатів).
  const [sOld, sMid, sNew] = await Promise.all([
    prisma.stream.create({ data: { userId: U, name: 'Збір на авто для ЗСУ', ...streamWindow(60, 5) } }),
    prisma.stream.create({ data: { userId: U, name: 'Вечірній марафон міст', ...streamWindow(18, 3) } }),
    prisma.stream.create({ data: { userId: U, name: 'Суботній стрім', url: 'https://www.twitch.tv/videos/2000000001', ...streamWindow(1, 4) } }),
  ]);
  const streamFor = (daysAgo: number) => (daysAgo > 30 ? sOld.id : daysAgo > 5 ? sMid.id : sNew.id);

  let i = 0;
  for (const [donorName, amountUah, settlementId, daysAgo = 0] of DONATIONS) {
    i++;
    const externalId = `demo-${i}`;
    await applyDonation(
      prisma,
      U,
      { externalId, donorName, amountUah, message: settlementId ?? 'дякую за стрім' },
      settlementId,
    );
    // Прив'язуємо донат і його бали до стріму; для давніх — зсуваємо createdAt у минуле
    // (період скоупиться саме за createdAt).
    const streamId = streamFor(daysAgo);
    const when = daysAgo > 0 ? { createdAt: daysAgoDate(daysAgo) } : {};
    const don = await prisma.donation.findUnique({
      where: { userId_externalId: { userId: U, externalId } },
      select: { id: true },
    });
    if (don) {
      await prisma.donation.update({ where: { id: don.id }, data: { streamId, ...when } });
      await prisma.pointEvent.updateMany({ where: { donationId: don.id }, data: { streamId, ...when } });
    }
  }
  // Демо-збір із ціллю + прив'язка 2 стрімів (щоб вкладка «Збори» показувала прогрес).
  const collection = await prisma.collection.create({
    data: { userId: U, name: 'На авто для бригади', goalUah: 6000, status: 'active' },
  });
  await prisma.stream.updateMany({ where: { id: { in: [sMid.id, sNew.id] } }, data: { collectionId: collection.id } });

  console.log(`[demo] залито ${i} донатів у 3 стрімах + 1 збір (dev-БД)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
