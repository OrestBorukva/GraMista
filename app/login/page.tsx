'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const f = new FormData(e.currentTarget);
    const { data, error } = await authClient.signIn.email({
      email: String(f.get('email')),
      password: String(f.get('password')),
    });
    setBusy(false);
    if (error) {
      setErr(
        error.status === 403
          ? 'Спершу підтверди пошту: ми щойно надіслали лист ще раз — перевір скриньку і папку «Спам».'
          : error.message ?? 'Невірний email або пароль',
      );
      return;
    }
    // Увімкнена 2FA → сесія ще не повна; сервер просить код із застосунку.
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      router.push('/two-factor'); return;
    }
    router.push('/dashboard'); router.refresh();
  }

  return (
    <main className="auth-wrap">
      <h1>Вхід</h1>
      <form onSubmit={onSubmit} className="auth-form">
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Пароль" required />
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" disabled={busy}>{busy ? '…' : 'Увійти'}</button>
      </form>
      <p><Link href="/forgot-password">Забули пароль?</Link></p>
      <p>Немає акаунта? <Link href="/register">Зареєструватися</Link></p>
    </main>
  );
}
