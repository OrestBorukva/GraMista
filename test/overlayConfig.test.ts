import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOverlayConfig } from '../lib/overlayConfig';

test('дефолти при порожньому query', () => {
  const c = parseOverlayConfig({});
  assert.equal(c.style, 'glass');
  assert.equal(c.period, 'all');
  assert.equal(c.rows, 5);
  assert.equal(c.sort, 'desc');
  assert.equal(c.feed, 'card');
  assert.equal(c.scale, 100);
  assert.equal(c.chroma, 'none');
  assert.equal(c.title, true);
  assert.equal(c.live, true);
});

test('preview=1 вимикає живе оновлення (SSE) — для прев\'ю в конструкторі', () => {
  assert.equal(parseOverlayConfig({ preview: '1' }).live, false);
  assert.equal(parseOverlayConfig({ preview: '0' }).live, true);
  assert.equal(parseOverlayConfig({}).live, true);
});

test('per-route дефолти', () => {
  const c = parseOverlayConfig({}, { period: 'stream', rows: 6 });
  assert.equal(c.period, 'stream');
  assert.equal(c.rows, 6);
});

test('невідоме значення → дефолт', () => {
  assert.equal(parseOverlayConfig({ style: 'neon' }).style, 'glass');
  assert.equal(parseOverlayConfig({ period: 'year' }).period, 'all');
  assert.equal(parseOverlayConfig({ chroma: 'rainbow' }).chroma, 'none');
});

test('rows і scale обрізаються в межі', () => {
  assert.equal(parseOverlayConfig({ rows: '999' }).rows, 20);
  assert.equal(parseOverlayConfig({ rows: '0' }).rows, 1);
  assert.equal(parseOverlayConfig({ rows: 'abc' }).rows, 5);
  assert.equal(parseOverlayConfig({ scale: '10' }).scale, 50);
  assert.equal(parseOverlayConfig({ scale: '500' }).scale, 200);
});

test('title=0 ховає заголовок; масив бере перше значення', () => {
  assert.equal(parseOverlayConfig({ title: '0' }).title, false);
  assert.equal(parseOverlayConfig({ title: '1' }).title, true);
  assert.equal(parseOverlayConfig({ style: ['solid', 'glass'] }).style, 'solid');
});

test('comment=0 ховає коментар донату; дефолт — показувати', () => {
  assert.equal(parseOverlayConfig({}).comment, true);
  assert.equal(parseOverlayConfig({ comment: '0' }).comment, false);
  assert.equal(parseOverlayConfig({ comment: '1' }).comment, true);
});

test('period=collection парситься; невідоме → дефолт collection', () => {
  assert.equal(parseOverlayConfig({ period: 'collection' }).period, 'collection');
  assert.equal(parseOverlayConfig({}, { period: 'collection' }).period, 'collection');
});

test('валідні значення проходять', () => {
  const c = parseOverlayConfig({ style: 'minimal', period: 'week', sort: 'asc', feed: 'list', scale: '120', chroma: 'green' });
  assert.equal(c.style, 'minimal');
  assert.equal(c.period, 'week');
  assert.equal(c.sort, 'asc');
  assert.equal(c.feed, 'list');
  assert.equal(c.scale, 120);
  assert.equal(c.chroma, 'green');
});
