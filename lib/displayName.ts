// Структурна валідація/санітизація імені стрімера при реєстрації. Чистий модуль — той самий
// код на клієнті (форма) і на сервері (databaseHook Better Auth — жорсткий гейт). Не контент-
// модерація (слури тощо — окремо, через приховування адміном): тут лише довжина й керівні
// символи, щоб не лізли багаторядкові/«ін'єкційні»/абсурдні імена, бо ім'я світиться публічно.

export type NameCheck = { ok: true; value: string } | { ok: false; error: string };

// Керівні ASCII-символи (вкл. переноси рядків і табуляцію) — у source як \x escape, не літерали.
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
const MULTI_SPACE = /\s+/g;

export function cleanDisplayName(raw: string): NameCheck {
  const value = raw.replace(CONTROL_CHARS, '').replace(MULTI_SPACE, ' ').trim();
  if (value.length < 2) return { ok: false, error: 'Імʼя — щонайменше 2 символи' };
  if (value.length > 50) return { ok: false, error: 'Імʼя — щонайбільше 50 символів' };
  return { ok: true, value };
}
