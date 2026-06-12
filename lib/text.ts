/**
 * Нормалізація тексту для матчингу міст і ключів довідника.
 * Нижній регістр, єдиний апостроф, лишаємо лише літери (кирилиця+латиниця) і пробіли.
 * Спільне джерело істини для seed (nameNorm/aliasNorm) і cityMatch — щоб збіги не «розповзались».
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ʼ’`'']/g, "'")
    .replace(/[^a-zа-яіїєґ' ]+/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
