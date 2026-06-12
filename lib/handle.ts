// Публічний слаг стрімера (адреса /<стрімер> §18). Чистий модуль (без Prisma) — його імпортують
// і клієнтські форми. Lower-case на вході; блок-лист зарезервованих кореневих маршрутів, щоб
// слаг не колізнувся з роутами на етапі 2.
const RESERVED = new Set([
  'login', 'register', 'settings', 'api', 'overlay', '_next',
  'donations', 'streams', 'collections', 'admin', 'overlays', 'city',
  // Глобальна мапа сервісу та її адмінка (/<слаг> зайнято стрімерами, ці слова — не для них).
  'ukraine', 'map', 'service',
]);
const RE = /^[a-z0-9_-]{3,30}$/;

export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase();
}

export type HandleCheck = { ok: true; handle: string } | { ok: false; error: string };

export function validateHandle(input: string): HandleCheck {
  const handle = normalizeHandle(input);
  if (!RE.test(handle)) return { ok: false, error: 'Слаг: 3–30 символів, лише a–z, 0–9, _ або -' };
  if (RESERVED.has(handle)) return { ok: false, error: 'Цей слаг зарезервований' };
  return { ok: true, handle };
}
