'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get('email'));
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    // Відповідь однакова незалежно від існування адреси — не розкриваємо базу акаунтів.
    setBusy(false); setDone(true);
  }

  return (
    <main className="auth-wrap">
      <h1>Скидання пароля</h1>
      {done ? (
        <p>Якщо така адреса зареєстрована — ми надіслали лист із посиланням. Перевір пошту і папку «Спам».</p>
      ) : (
        <form onSubmit={onSubmit} className="auth-form">
          <input name="email" type="email" placeholder="Email" required />
          <button type="submit" disabled={busy}>{busy ? '…' : 'Надіслати посилання'}</button>
        </form>
      )}
      <p><Link href="/login">До входу</Link></p>
    </main>
  );
}
