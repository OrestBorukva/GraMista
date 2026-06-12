'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

function VerifyEmailInner() {
  const email = useSearchParams().get('email') ?? '';
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    await authClient.sendVerificationEmail({ email, callbackURL: '/dashboard' });
    setBusy(false); setSent(true);
  }

  return (
    <main className="auth-wrap">
      <h1>Перевір пошту</h1>
      <p>
        Ми надіслали лист{email ? <> на <b>{email}</b></> : null}. Перейди за посиланням у
        ньому, щоб підтвердити адресу. Якщо листа не видно — глянь у папку «Спам».
      </p>
      {sent ? (
        <p>Лист надіслано ще раз ✅</p>
      ) : (
        email && <button onClick={resend} disabled={busy}>{busy ? '…' : 'Надіслати лист ще раз'}</button>
      )}
      <p><Link href="/login">До входу</Link></p>
    </main>
  );
}

// useSearchParams вимагає Suspense-межі на статично рендерених сторінках.
export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailInner /></Suspense>;
}
