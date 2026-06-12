import { Client } from 'pg';
import { z } from 'zod';

// LISTEN/UNLISTEN не приймають параметрів — назву каналу не можна підставити плейсхолдером,
// тож валідуємо її як безпечний SQL-ідентифікатор (інакше — ризик ін'єкції).
const channelSchema = z.string().regex(/^[a-z_][a-z0-9_]*$/, 'недопустима назва каналу');

export type Unlisten = () => Promise<void>;

/**
 * Підписка на Postgres LISTEN/NOTIFY на ОКРЕМОМУ з'єднанні.
 * Prisma не віддає сире LISTEN, тож тримаємо власний клієнт `pg` на час підписки.
 * Повертає функцію відписки: знімає слухач, робить UNLISTEN і закриває з'єднання
 * (щоб не текли конекшени — головний ризик довгоживучих SSE-запитів).
 *
 * connectionString за замовчуванням — DATABASE_URL.
 */
export async function listen(
  channel: string,
  onPayload: (payload: string) => void,
  opts: { connectionString?: string } = {},
): Promise<Unlisten> {
  const ch = channelSchema.parse(channel);
  const connectionString = opts.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL не задано');

  const client = new Client({ connectionString });
  // Без обробника 'error' розрив з'єднання впав би неперехопленою подією й поклав процес.
  // Логуємо (не секрет) і даємо потоку згорнутись — браузерний EventSource перепідключиться сам.
  client.on('error', (e: Error) => console.error('[pgListen] помилка зʼєднання:', e.message));
  await client.connect();

  const handler = (msg: { channel: string; payload?: string }) => {
    if (msg.channel === ch) onPayload(msg.payload ?? '');
  };
  client.on('notification', handler);

  // ch уже звужено регуляркою до безпечного ідентифікатора — підставляємо як є
  // (без лапок, щоб збігтись із pg_notify('donation', …) у воркері).
  await client.query(`LISTEN ${ch}`);

  let closed = false;
  return async () => {
    if (closed) return;
    closed = true;
    client.removeListener('notification', handler);
    try {
      await client.query(`UNLISTEN ${ch}`);
    } catch {
      // з'єднання могло вже відпасти — однаково закриваємо нижче
    }
    await client.end();
  };
}
