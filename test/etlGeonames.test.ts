import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGeonames, buildGeoIndex } from '../lib/etl/geonames';

// 19 колонок TSV GeoNames (нам важливі: 2=name,3=ascii,4=alternates,5=lat,6=lon,7=fclass,11=admin1,15=population)
const row = (name: string, ascii: string, alts: string, lat: number, lon: number, fclass: string, admin1: string, pop: number) =>
  ['1', name, ascii, alts, String(lat), String(lon), fclass, 'PPL', 'UA', '', admin1, '', '', '', String(pop), '', '', '', ''].join('\t');

const TSV = [
  row('Brovary', 'Brovary', 'Бровари,Бровары,Browary', 50.51809, 30.80671, 'P', '13', 109473),
  row('Some Hill', 'Some Hill', 'Гора', 50, 30, 'T', '13', 0), // не P — пропустити
  // дві Іванівки в ОДНІЙ області з різними точками → координатам не довіряємо
  // (admin1 '01' у GeoNames = Черкаська — НЕ плутати з префіксом КАТОТТГ, там 01 = Крим!)
  row('Ivanivka A', 'Ivanivka', 'Іванівка', 49.0, 31.0, 'P', '01', 500),
  row('Ivanivka B', 'Ivanivka', 'Іванівка', 49.9, 31.9, 'P', '01', 120),
].join('\n');

test('parseGeonames: лише клас P, координати/населення/варіанти', () => {
  const places = parseGeonames(TSV);
  assert.equal(places.length, 3);
  assert.equal(places[0]?.alternates.includes('Бровари'), true);
  assert.equal(places[0]?.population, 109473);
});

test('buildGeoIndex: ключ (назваNorm|область); тезки в одній області → ambiguous', () => {
  const idx = buildGeoIndex(parseGeonames(TSV));
  const brovary = idx.get('бровари|Київська');
  assert.ok(brovary);
  assert.equal(brovary.ambiguous, false);
  assert.equal(Math.round(brovary.lat), 51);
  assert.ok(brovary.aliasCandidates.includes('Brovary'), 'латинська назва — кандидат в аліаси');
  assert.ok(brovary.aliasCandidates.includes('Бровары'), 'кирилічні варіанти — кандидати');

  const ivanivka = idx.get('іванівка|Черкаська'); // GeoNames admin1 '01' = Черкаська
  assert.ok(ivanivka);
  assert.equal(ivanivka.ambiguous, true, 'дві різні точки під одним ключем');
  assert.equal(ivanivka.population, 500, 'населення — від більшого НП (tie-breaker лишається корисним)');
});
