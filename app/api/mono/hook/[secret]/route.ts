import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { handleMonoEvent, findActiveMonoSource, type MonoSource } from '@/lib/monoHook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Послідовна обробка per-source: конкурентні вебхуки одного стрімера не ганяються
// за спільною скарбничкою (lost update у creditPool). Між процесами захищає
// транзакція applyDonation; тут прибираємо гонку всередині процесу.
const chains = new Map<string, Promise<void>>();

export async function GET(): Promise<Response> {
  // monobank валідує webHookUrl GET-запитом і чекає строго HTTP 200 — безумовно:
  // на момент валідації секрет ще НЕ записаний у БД (setWebhook іде перед записом).
  return new Response('ok');
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ secret: string }> },
): Promise<Response> {
  const { secret } = await params;

  // Невідомий секрет / відключене джерело → 404 СВІДОМО: після трьох не-200
  // monobank сам вимикає вебхук, і банк перестає слати рухи рахунків стрімера
  // на наш сервер (зняти вебхук без токена інакше неможливо — zero token storage).
  // Транзитна помилка БД не повинна вбити живий вебхук → тоді 200 без обробки.
  let source: MonoSource | null = null;
  try {
    source = await findActiveMonoSource(prisma, secret);
  } catch {
    return new Response('ok');
  }
  if (!source) return new Response('не знайдено', { status: 404 });

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    // битий JSON при живому джерелі — однаково 200: не дати сміттю вимкнути вебхук
  }

  // Відповідаємо 200 ДО обробки (ліміт monobank — 5 секунд), обробка — після відповіді.
  after(async () => {
    if (!payload) return;
    const src = source;
    const prev = chains.get(src.id) ?? Promise.resolve();
    const next = prev
      .then(() => handleMonoEvent(prisma, src, payload))
      .then(() => undefined)
      .catch((e) => console.error('[mono-hook] помилка обробки:', (e as Error).message));
    chains.set(src.id, next);
    await next;
    if (chains.get(src.id) === next) chains.delete(src.id);
  });

  return new Response('ok');
}
