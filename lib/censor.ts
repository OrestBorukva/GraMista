import { BASE_BANNED, BASE_WHITELIST } from './censorWords';

// Рушій цензури коментарів донатів (спека docs/specs/2026-06-12-comment-display-and-censorship-design.md).
// Стандартна техніка: нормалізація токена → білий список (префікс) → чорний список (підрядок
// з вайлдкардом). Чисті функції без БД — налаштування приходять аргументом.

export const COMMENT_MODES = ['mask', 'replace', 'city', 'hide'] as const;
export type CommentMode = (typeof COMMENT_MODES)[number];

export interface CommentSettings {
  mode: CommentMode;
  /** Власні заборонені слова стрімера (через кому/нові рядки). */
  added: string;
  /** Власні винятки — не цензурити (через кому/нові рядки). */
  allowed: string;
}

/** Звуження довільного рядка з БД до CommentMode (невідоме → 'mask'). */
export function toCommentMode(v: string | null | undefined): CommentMode {
  return (COMMENT_MODES as readonly string[]).includes(v ?? '') ? (v as CommentMode) : 'mask';
}

// Візуальні двійники латиниці й цифр → кирилиця (типова обфускація: xуй, пи3да, бл@дь).
const LOOKALIKE: Record<string, string> = {
  a: 'а', c: 'с', e: 'е', i: 'і', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', u: 'у', x: 'х', y: 'у', z: 'з',
  '@': 'а', '0': 'о', '3': 'з', '1': 'і', '4': 'ч',
};
const WILDCARDS = new Set(['*', '#', '•']);

/**
 * Нормалізована форма токена для матчингу: нижній регістр, двійники → кирилиця,
 * '*'/'#'/'•' → '?' (вайлдкард = одна будь-яка літера), решта не-літер відкидається,
 * повтори ЛІТЕР стискаються (хуууй → хуй; '??' лишаються — кожна зірочка = одна літера).
 */
export function normalizeForMatch(raw: string): string {
  let out = '';
  for (const ch of raw.toLowerCase()) {
    if (ch === 'ё') out += 'е';
    else if (/[а-яіїєґ]/.test(ch)) out += ch;
    else if (LOOKALIKE[ch]) out += LOOKALIKE[ch];
    else if (WILDCARDS.has(ch)) out += '?';
    // інше (пунктуація, апострофи, емодзі, пробіли) — роздільник: пропускаємо
  }
  return out.replace(/([а-яіїєґ])\1+/g, '$1');
}

/** Розбір користувацького списку (коми/нові рядки/;) у нормалізовані стеми ≥ 2 літер. */
export function parseWordList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((w) => normalizeForMatch(w.trim()))
    .filter((w) => w.length >= 2 && !w.includes('?'));
}

/** Чи містить нормалізований токен стем; '?' у токені збігається з будь-якою літерою стема. */
function matchesStem(norm: string, stem: string): boolean {
  if (stem.length === 0 || stem.length > norm.length) return false;
  for (let i = 0; i + stem.length <= norm.length; i++) {
    let ok = true;
    for (let j = 0; j < stem.length; j++) {
      const c = norm[i + j];
      if (c !== stem[j] && c !== '?') { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

function isWhitelisted(norm: string, whitelist: readonly string[]): boolean {
  if (norm.includes('?')) return false; // обфусковане не може бути «легальним» словом
  return whitelist.some((w) => norm.startsWith(w));
}

function maskToken(original: string): string {
  return original.charAt(0) + '*'.repeat(Math.max(2, original.length - 1));
}

/** Чистка мату у вільному тексті — для режимів 'mask'/'replace'. */
export function censorText(
  text: string,
  opts: { mode: 'mask' | 'replace'; added: string; allowed: string },
): string {
  const allowedStems = parseWordList(opts.allowed);
  const allowedSet = new Set(allowedStems);
  const banned = [...new Set([...BASE_BANNED, ...parseWordList(opts.added)])].filter((s) => !allowedSet.has(s));
  const whitelist = [...BASE_WHITELIST, ...allowedStems];
  const isBad = (norm: string) =>
    norm !== '' && !isWhitelisted(norm, whitelist) && banned.some((s) => matchesStem(norm, s));
  const replacement = (original: string) => (opts.mode === 'mask' ? maskToken(original) : '[цензура]');

  // split із захопленням пробілів: парні індекси — слова, непарні — роздільники (збірка без втрат).
  const parts = text.split(/(\s+)/);
  const norms = parts.map((p, i) => (i % 2 === 0 ? normalizeForMatch(p) : ''));

  // Прохід 1: цілі токени.
  for (let i = 0; i < parts.length; i += 2) {
    if (isBad(norms[i] ?? '')) parts[i] = replacement(parts[i] ?? '');
  }

  // Прохід 2: розірвана обфускація («х у й») — 2+ сусідні ОДНОлітерні токени зливаються
  // і перевіряються як одне слово; збіг → маскується весь спан. Звичайних слів не зачіпає.
  for (let i = 0; i < parts.length; i += 2) {
    if ((norms[i] ?? '').length !== 1) continue;
    let end = i;
    while (end + 2 < parts.length && (norms[end + 2] ?? '').length === 1) end += 2;
    if (end > i) {
      let merged = '';
      for (let j = i; j <= end; j += 2) merged += norms[j] ?? '';
      if (isBad(merged)) {
        const glued = parts.slice(i, end + 1).join('').replace(/\s+/g, '');
        parts[i] = replacement(glued);
        for (let j = i + 1; j <= end; j++) parts[j] = '';
      }
    }
    i = end; // наступна ітерація піде з end+2 — спан не сканується повторно
  }

  return parts.join('');
}

export interface WordLists {
  /** Вбудовані стеми, що зараз ДІЮТЬ (мінус винятки стрімера). */
  base: string[];
  /** Власні слова стрімера, що діють (мінус винятки). */
  custom: string[];
  /** Винятки стрімера (не цензуряться). */
  exceptions: string[];
}

/** Списки для UI налаштувань — те, що реально діє в censorText (єдина логіка обчислення). */
export function wordListsForUi(added: string, allowed: string): WordLists {
  const exceptions = parseWordList(allowed);
  const excSet = new Set(exceptions);
  return {
    base: BASE_BANNED.filter((s) => !excSet.has(s)),
    custom: parseWordList(added).filter((w) => !excSet.has(w) && !BASE_BANNED.includes(w)),
    exceptions,
  };
}

/**
 * Єдине джерело істини «що показати в слоті коментаря донату» (4 режими стрімера):
 * mask/replace → вільний текст із зацензуреним матом; city → лише розпізнане місто;
 * hide → ''. Порожній результат = поверхня не рендерить коментар.
 */
export function commentForDisplay(
  rawMessage: string,
  cityName: string | null,
  s: CommentSettings,
): string {
  if (s.mode === 'hide') return '';
  if (s.mode === 'city') return cityName ?? '';
  return censorText(rawMessage, { mode: s.mode, added: s.added, allowed: s.allowed }).trim();
}
