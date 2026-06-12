import { listen, type Unlisten } from './pgListen';

// Спільний слухач каналу 'donation' на процес: N SSE-клієнтів (глядачі публічної сторінки,
// панель, оверлеї) = ОДНЕ pg-зʼєднання, payload роздається всім підписникам у памʼяті.
// Перший підписник відкриває LISTEN, останній — закриває зʼєднання (не течуть конекшени).
// opts.connectionString — лише для тестів (бере його ПЕРШИЙ підписник, що відкриває зʼєднання).

type Subscriber = (payload: string) => void;
export type Unsubscribe = () => Promise<void>;

const subs = new Set<Subscriber>();
let conn: Promise<Unlisten> | null = null;

async function ensureListening(opts: { connectionString?: string }): Promise<void> {
  if (!conn) {
    conn = listen(
      'donation',
      (payload) => {
        // Копія: підписник може відписатись прямо в колбеку.
        for (const s of [...subs]) {
          try {
            s(payload);
          } catch (e) {
            console.error('[donationBus] помилка підписника:', (e as Error).message);
          }
        }
      },
      opts,
    );
  }
  try {
    await conn;
  } catch (e) {
    conn = null; // невдале відкриття не «застрягає» — наступний підписник спробує знову
    throw e;
  }
}

async function teardownIfIdle(): Promise<void> {
  if (subs.size > 0 || !conn) return;
  const closing = conn;
  conn = null; // якщо за час закриття зʼявиться новий підписник — він відкриє НОВЕ зʼєднання
  const unlisten = await closing.catch(() => null);
  if (unlisten) await unlisten();
}

export async function subscribe(cb: Subscriber, opts: { connectionString?: string } = {}): Promise<Unsubscribe> {
  subs.add(cb);
  try {
    await ensureListening(opts);
  } catch (e) {
    subs.delete(cb);
    await teardownIfIdle();
    throw e;
  }
  let off = false;
  return async () => {
    if (off) return;
    off = true;
    subs.delete(cb);
    await teardownIfIdle();
  };
}

/** Чи відкрите зараз спільне зʼєднання (для тестів/діагностики). */
export function busActive(): boolean {
  return conn !== null;
}
