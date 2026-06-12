// Відправка пошти через Resend HTTP API. Без npm-пакета: один POST, бібліотека зайва.
// Без RESEND_API_KEY (локальна розробка) лист не шлеться — вміст логуються в консоль,
// щоб посилання підтвердження/скидання можна було відкрити руками.

const RESEND_API_URL = 'https://api.resend.com/emails';

export type EmailContent = { subject: string; html: string; text: string };

// Анти-спам понад per-IP ліміти Better Auth (IP можна міняти, тому самих їх мало):
// 1) стеля на адресу-отримувача — захищає людину, чий email хтось вписує знову і знову;
// 2) глобальна денна стеля — захищає квоту Resend (безкоштовний тариф: 100 листів/день).
// Стан у памʼяті процесу: інстанс один (VPS), після рестарту обнуляється — цього досить.
const RECIPIENT_HOUR_MAX = 5;
const GLOBAL_DAY_MAX = 90;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
let perRecipient = new Map<string, number[]>();
let dayStart = 0;
let dayCount = 0;

export function emailSendAllowed(to: string, now = Date.now()): boolean {
  if (now - dayStart >= DAY_MS) { dayStart = now; dayCount = 0; }
  if (dayCount >= GLOBAL_DAY_MAX) return false;
  const recent = (perRecipient.get(to) ?? []).filter((t) => now - t < HOUR_MS);
  if (recent.length >= RECIPIENT_HOUR_MAX) { perRecipient.set(to, recent); return false; }
  recent.push(now);
  perRecipient.set(to, recent);
  dayCount++;
  // Мапа не повинна рости вічно — зрідка викидаємо адреси без свіжих відправок.
  if (perRecipient.size > 1000) {
    for (const [k, v] of perRecipient) if (v.every((t) => now - t >= HOUR_MS)) perRecipient.delete(k);
  }
  return true;
}

// Лише для тестів: обнуляє лічильники між кейсами.
export function _resetEmailLimits(): void {
  perRecipient = new Map();
  dayStart = 0;
  dayCount = 0;
}

function htmlLayout(title: string, body: string, url: string, button: string, footer: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 12px">${title}</h2>
  <p style="margin:0 0 20px;line-height:1.5">${body}</p>
  <p style="margin:0 0 20px"><a href="${url}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">${button}</a></p>
  <p style="color:#777;font-size:13px;line-height:1.5">Якщо кнопка не працює — відкрий посилання:<br>${url}<br><br>${footer}</p>
</div>`;
}

export function buildVerificationEmail(url: string): EmailContent {
  const title = 'Підтверди свою пошту';
  const body = 'Дякуємо за реєстрацію в GraMista! Натисни кнопку, щоб підтвердити адресу і почати користуватися сервісом. Якщо листа довго не було — перевір папку «Спам».';
  const footer = 'Якщо ти не реєструвався в GraMista — просто проігноруй цей лист.';
  return {
    subject: 'Підтверди свою пошту — GraMista',
    html: htmlLayout(title, body, url, 'Підтвердити пошту', footer),
    text: `${title}\n\n${body}\n\nПосилання: ${url}\n\n${footer}`,
  };
}

export function buildResetPasswordEmail(url: string): EmailContent {
  const title = 'Скидання пароля';
  const body = 'Хтось (сподіваємось, ти) попросив змінити пароль до акаунта GraMista. Натисни кнопку, щоб задати новий пароль. Посилання діє 1 годину.';
  const footer = 'Якщо це був не ти — нічого не роби, пароль не зміниться.';
  return {
    subject: 'Скидання пароля — GraMista',
    html: htmlLayout(title, body, url, 'Задати новий пароль', footer),
    text: `${title}\n\n${body}\n\nПосилання: ${url}\n\n${footer}`,
  };
}

export async function sendEmail(to: string, content: EmailContent): Promise<void> {
  if (!emailSendAllowed(to)) {
    console.warn(`[email] пропущено лімітом анти-спаму → ${to}: ${content.subject}`);
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] dev-режим (RESEND_API_KEY не задано) → ${to}: ${content.subject}\n${content.text}`);
    return;
  }
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'GraMista <noreply@localhost>',
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    });
    // Не валимо потік auth через поштову помилку; вміст листа не логуються (там токен).
    if (!res.ok) console.error(`[email] Resend відповів ${res.status}: ${await res.text()}`);
  } catch (e) {
    console.error('[email] не вдалося надіслати лист:', e);
  }
}
