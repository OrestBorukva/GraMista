import 'dotenv/config';
import { createReadStream, existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { normalize } from '../lib/text';

// Генерує lib/cityStopForms.ts — список форм довідника НП, що збігаються зі ЗВИЧАЙНИМИ
// українськими словами (Добре, Веселе, Перемога, «суми», «рівне»…). Резолвер вимагає для них
// маркер «село/місто…» або підказку області (малі НП), інакше «все буде добре» дає бали селу Добре.
// Перетин: (назви + аліаси з БД) ∩ (НЕ-власні словоформи ВЕСУМ dict_corp_vis.txt).
// Запускати після db:import (довідник у БД мусить бути повний): npx tsx prisma/gen-stop-forms.ts
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const dictPath = join(process.cwd(), 'data', 'sources', 'dict_corp_vis.txt');
  if (!existsSync(dictPath)) throw new Error(`Нема ${dictPath} — команди завантаження в плані етапу 3`);

  const [settlements, aliases] = await Promise.all([
    prisma.settlement.findMany({ select: { nameNorm: true } }),
    prisma.settlementAlias.findMany({ select: { aliasNorm: true } }),
  ]);
  const dbForms = new Set<string>();
  for (const s of settlements) dbForms.add(s.nameNorm);
  for (const a of aliases) dbForms.add(a.aliasNorm);
  console.log(`[stop-forms] форм у довіднику: ${dbForms.size}`);

  // Стрім словника: будь-яка словоформа БЕЗ тега :prop (не власна назва) = звичайне слово.
  const stop = new Set<string>();
  const rl = createInterface({ input: createReadStream(dictPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const raw of rl) {
    const line = raw.trim();
    if (!line) continue;
    const sp = line.indexOf(' ');
    if (sp <= 0) continue;
    const tags = line.slice(sp + 1);
    if (tags.includes(':prop')) continue;
    const w = normalize(line.slice(0, sp));
    if (w && dbForms.has(w)) stop.add(w);
  }

  const sorted = [...stop].sort();
  const body = [
    '// ЗГЕНЕРОВАНО prisma/gen-stop-forms.ts — НЕ редагувати руками; перегенерувати після db:import.',
    '// Форми довідника НП, що збігаються зі звичайними українськими словами (ВЕСУМ, не-власні).',
    '// Резолвер вимагає для малих НП із такою формою маркер «село/місто…» або підказку області.',
    'export const CITY_STOP_FORMS: ReadonlySet<string> = new Set([',
    ...sorted.map((w) => `  '${w.replace(/'/g, "\\'")}',`),
    ']);',
    '',
  ].join('\n');
  writeFileSync(join(process.cwd(), 'lib', 'cityStopForms.ts'), body, 'utf8');
  console.log(`[stop-forms] записано lib/cityStopForms.ts: ${sorted.length} форм`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
