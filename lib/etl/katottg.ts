import { parse } from 'csv-parse/sync';
import { normalize } from '../text';

// Рядок katottg.csv «як є» (колонки звірені по живому файлу; BOM/лапки обробляє csv-parse).
interface KatottgRow {
  code?: string;
  name?: string;
  level?: string;
  category?: string;
  category_name?: string;
  district?: string;
  council?: string;
}

export interface ImportSettlement {
  katottg: string;
  name: string;
  nameNorm: string;
  /** 'місто' | 'селище міського типу' | 'селище' | 'село' | null (порожня категорія в джерелі). */
  type: string | null;
  oblast: string;
  raion: string | null;
  hromada: string | null;
}

// Область — за префіксом коду КАТОТТГ (UAxx…): колонка region у датасеті бита
// (для UA32 містить «Чорнобиль»), а префікси кодів — надійні (звірено по живому файлу).
export const OBLAST_BY_PREFIX: Record<string, string> = {
  '01': 'Автономна Республіка Крим',
  '05': 'Вінницька', '07': 'Волинська', '12': 'Дніпропетровська', '14': 'Донецька',
  '18': 'Житомирська', '21': 'Закарпатська', '23': 'Запорізька', '26': 'Івано-Франківська',
  '32': 'Київська', '35': 'Кіровоградська', '44': 'Луганська', '46': 'Львівська',
  '48': 'Миколаївська', '51': 'Одеська', '53': 'Полтавська', '56': 'Рівненська',
  '59': 'Сумська', '61': 'Тернопільська', '63': 'Харківська', '65': 'Херсонська',
  '68': 'Хмельницька', '71': 'Черкаська', '73': 'Чернівецька', '74': 'Чернігівська',
};

export function parseKatottgCsv(csvText: string): KatottgRow[] {
  return parse(csvText, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as KatottgRow[];
}

/**
 * Рядки CSV → поселення для імпорту: рівень 4 (населені пункти) без «районів у місті»
 * (категорія Р) + Київ/Севастополь (рівень 1, спец-статус, областю слугує «м. …»).
 * Дедуп за кодом (у джерелі є повтори); рядки «… міська рада» — другий запис Києва — пропускаються.
 * Порожня категорія — теж справжні НП (серед них навіть Миколаїв) → type=null.
 */
export function mapSettlements(rows: KatottgRow[]): ImportSettlement[] {
  const out = new Map<string, ImportSettlement>();
  for (const r of rows) {
    const code = (r.code ?? '').trim();
    const name = (r.name ?? '').trim();
    if (!code || !name) continue;
    if (out.has(code)) continue;
    if (name.endsWith('міська рада')) continue;

    if (r.level === '1') {
      if (code.startsWith('UA80') && name === 'Київ') {
        out.set(code, { katottg: code, name, nameNorm: normalize(name), type: 'місто', oblast: 'м. Київ', raion: null, hromada: null });
      } else if (code.startsWith('UA85') && name === 'Севастополь') {
        out.set(code, { katottg: code, name, nameNorm: normalize(name), type: 'місто', oblast: 'м. Севастополь', raion: null, hromada: null });
      }
      continue;
    }
    if (r.level !== '4') continue;
    if ((r.category ?? '').trim() === 'Р') continue;

    const oblast = OBLAST_BY_PREFIX[code.slice(2, 4)];
    if (!oblast) continue; // невідомий префікс — не вгадуємо

    out.set(code, {
      katottg: code,
      name,
      nameNorm: normalize(name),
      type: (r.category_name ?? '').trim() || null,
      oblast,
      raion: (r.district ?? '').trim() || null,
      hromada: (r.council ?? '').trim() || null,
    });
  }
  return [...out.values()];
}
