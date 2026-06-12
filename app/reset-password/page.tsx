'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const invalid = !token || params.get('error') !== null;
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const newPassword = String(new FormData(e.currentTarget).get('password'));
    const { error } = await authClient.resetPassword({ newPassword, token: token ?? '' });
    setBusy(false);
    if (error) { setErr(error.message ?? 'Не вдалося змінити пароль. Спробуй запросити нове посилання.'); return; }
    setDone(true);
  }

  if (invalid) {
    return (
      <main className="auth-wrap">
        <h1>Посилання недійсне</h1>
        <p>Посилання застаріло або вже використане (воно діє 1 годину).</p>
        <p><Link href="/forgot-password">Запросити нове</Link></p>
      </main>
    );
  }

  return (
    <main className="auth-wrap">
      <h1>Новий пароль</h1>
      {done ? (
        <p>Пароль змінено ✅ <Link href="/login">Увійти</Link></p>
      ) : (
        <form onSubmit={onSubmit} className="auth-form">
          <input name="password" type="password" placeholder="Новий пароль (мін. 8)" required minLength={8} />
          {err && <p className="auth-err">{err}</p>}
          <button type="submit" disabled={busy}>{busy ? '…' : 'Зберегти пароль'}</button>
        </form>
      )}
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordInner /></Suspense>;
}
