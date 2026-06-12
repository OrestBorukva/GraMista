/**
 * Анонімізація імені донатера для показу назовні: «Ім'я П.» (docs/CONCEPT.md §10).
 * Повне ім'я лишається лише внутрішньо (ключ скарбнички). Порожнє → ''.
 */
export function anonymize(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  const first = parts[0];
  const second = parts[1];
  if (first && second) return `${first} ${second.charAt(0)}.`;
  return trimmed;
}
