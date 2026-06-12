import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeDonationNotify, parseDonationNotify } from '../lib/notify';

test('encode→parse роундтріп', () => {
  assert.deepEqual(parseDonationNotify(encodeDonationNotify('user1', 'ext-9')),
    { userId: 'user1', externalId: 'ext-9' });
});

test('externalId із двокрапкою зберігається (split по першій)', () => {
  assert.deepEqual(parseDonationNotify(encodeDonationNotify('u', 'a:b:c')),
    { userId: 'u', externalId: 'a:b:c' });
});

test('биті payload → null', () => {
  assert.equal(parseDonationNotify('noseparator'), null);
  assert.equal(parseDonationNotify(':ext'), null);
  assert.equal(parseDonationNotify('user:'), null);
});
