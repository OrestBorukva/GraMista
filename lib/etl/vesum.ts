import { normalize } from '../text';

/**
 * Стрімовий парсер dict_corp_vis.txt (ВЕСУМ): блоки «лема без відступу + форми з відступом 2 пробіли».
 * Збирає ОРИГІНАЛЬНІ відмінкові форми для лем-топонімів (тег :geo), нормалізована назва яких
 * є в довіднику (wanted). Файл ~318 МБ — лише построково, без читання в памʼять цілком.
 */
export async function collectGeoForms(
  lines: AsyncIterable<string>,
  wanted: Set<string>,
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  // Нормалізована лема активного блока; null — блок нас не цікавить.
  let currentLemma: string | null = null;
  for await (const raw of lines) {
    const indented = raw.startsWith('  ');
    const line = raw.trim();
    if (!line) continue;
    const sp = line.indexOf(' ');
    const word = sp > 0 ? line.slice(0, sp) : line;
    const tags = sp > 0 ? line.slice(sp + 1) : '';

    if (!indented) {
      currentLemma = null;
      if (!tags.includes(':geo')) continue;
      const lemmaNorm = normalize(word);
      if (!wanted.has(lemmaNorm)) continue;
      currentLemma = lemmaNorm;
      continue;
    }
    if (!currentLemma) continue;
    const formNorm = normalize(word);
    if (!formNorm || formNorm === currentLemma) continue;
    let set = out.get(currentLemma);
    if (!set) {
      set = new Set();
      out.set(currentLemma, set);
    }
    set.add(word);
  }
  return out;
}
