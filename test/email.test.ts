import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVerificationEmail,
  buildResetPasswordEmail,
  sendEmail,
  emailSendAllowed,
  _resetEmailLimits,
} from '../lib/email';

const URL_SAMPLE = 'https://gramista.example.com/api/auth/verify-email?token=abc123';

test('лист підтвердження: укр. тема, посилання в html і text, примітка про спам', () => {
  const m = buildVerificationEmail(URL_SAMPLE);
  assert.match(m.subject, /Підтверд/u);
  assert.ok(m.html.includes(URL_SAMPLE));
  assert.ok(m.text.includes(URL_SAMPLE));
  assert.match(m.text, /спам/iu);
});

test('лист скидання пароля: укр. тема, посилання, фраза «якщо це не ти»', () => {
  const m = buildResetPasswordEmail(URL_SAMPLE);
  assert.match(m.subject, /парол/iu);
  assert.ok(m.html.includes(URL_SAMPLE));
  assert.ok(m.text.includes(URL_SAMPLE));
  assert.match(m.text, /не ти/iu);
});

test('sendEmail без RESEND_API_KEY — dev-фолбек, не кидає і нічого не фетчить', async () => {
  delete process.env.RESEND_API_KEY;
  // якщо фолбек зламається і піде у fetch — тест упаде по таймауту/мережі
  await sendEmail('dev@example.com', buildVerificationEmail(URL_SAMPLE));
});

test('ліміт отримувача: 6-й лист на ту саму адресу за годину — відмова, через годину — знову можна', () => {
  _resetEmailLimits();
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(emailSendAllowed('victim@example.com', t0 + i), true);
  assert.equal(emailSendAllowed('victim@example.com', t0 + 100), false);
  assert.equal(emailSendAllowed('victim@example.com', t0 + 3_600_000 + 10), true);
});

test('глобальна денна стеля: після 90 листів — відмова всім, наступної доби — знову можна', () => {
  _resetEmailLimits();
  const t0 = 1_000_000;
  for (let i = 0; i < 90; i++) assert.equal(emailSendAllowed(`u${i}@example.com`, t0 + i), true);
  assert.equal(emailSendAllowed('u-new@example.com', t0 + 200), false);
  assert.equal(emailSendAllowed('u-new@example.com', t0 + 24 * 3_600_000 + 10), true);
});
