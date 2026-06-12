import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHandle, validateHandle } from '../lib/handle';

test('lower-case на вході: Dev і dev — однакові', () => {
  assert.equal(normalizeHandle('Dev'), 'dev');
  assert.equal(normalizeHandle('  OREST  '), 'orest');
});

test('валідний слаг повертається нормалізованим', () => {
  assert.deepEqual(validateHandle('Orest_2026'), { ok: true, handle: 'orest_2026' });
});

test('закороткий/задовгий — помилка', () => {
  assert.equal(validateHandle('ab').ok, false);
  assert.equal(validateHandle('x'.repeat(31)).ok, false);
});

test('зарезервовані маршрути відхиляються', () => {
  for (const w of ['login', 'register', 'settings', 'api', 'overlay', 'donations', 'streams', 'ukraine', 'map', 'service']) {
    assert.equal(validateHandle(w).ok, false, w);
  }
});

test('недозволені символи відхиляються', () => {
  assert.equal(validateHandle('Київ').ok, false);
  assert.equal(validateHandle('a b').ok, false);
});
