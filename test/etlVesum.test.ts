import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectGeoForms } from '../lib/etl/vesum';

async function* lines(arr: string[]): AsyncGenerator<string> {
  yield* arr;
}

// Формат dict_corp_vis.txt: лема — без відступу, форми — з відступом 2 пробіли (звірено по файлу).
const FIXTURE = [
  'Тернопіль noun:inanim:m:v_naz:prop:geo',
  '  Тернополя noun:inanim:m:v_rod:prop:geo',
  '  Тернополю noun:inanim:m:v_dav:prop:geo',
  '  Тернопіль noun:inanim:m:v_zna:prop:geo', // = лемі → пропустити
  '  Тернополі noun:inanim:m:v_mis:prop:geo',
  'абажур noun:inanim:m:v_naz', // не топонім — блок ігнорується
  '  абажура noun:inanim:m:v_rod',
  'Авдіївка noun:inanim:f:v_naz:prop:geo    # коментар у файлі',
  '  Авдіївки noun:inanim:f:v_rod:prop:geo',
];

test('collectGeoForms: збирає форми лише для гео-лем зі списку wanted', async () => {
  const forms = await collectGeoForms(lines(FIXTURE), new Set(['тернопіль']));
  assert.deepEqual([...forms.keys()], ['тернопіль']);
  // Порівнюємо МНОЖИНИ (deepEqual на Set ігнорує порядок — сортування кирилиці підступне).
  assert.deepEqual(forms.get('тернопіль'), new Set(['Тернополя', 'Тернополю', 'Тернополі']));
});

test('collectGeoForms: лема поза wanted або без :geo — пропускається', async () => {
  const forms = await collectGeoForms(lines(FIXTURE), new Set(['абажур', 'неіснуюче']));
  assert.equal(forms.size, 0, 'абажур не топонім, Авдіївка не в wanted');
});
