'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

// Введення коду 2FA при вході (сервер попросив після правильного пароля). Код із застосунку-
// автентифікатора або одноразовий backup-код. Успіх → повна сесія → дашборд.
export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const { error } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (error) { setErr('Невірний код — спробуй ще раз'); return; }
    router.push('/dashboard'); router.refresh();
  }

  return (
    <main className="auth-wrap">
      <h1>Підтвердження входу</h1>
      <form onSubmit={onSubmit} className="auth-form">
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          {backup ? 'Введи один зі своїх резервних кодів.' : 'Введи код із застосунку-автентифікатора.'}
        </p>
        <input
          name="code"
          inputMode={backup ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          placeholder={backup ? 'Резервний код' : 'Код (6 цифр)'}
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
          required
          autoFocus
        />
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" disabled={busy}>{busy ? '…' : 'Підтвердити'}</button>
      </form>
      <p>
        <button type="button" className="link-btn" onClick={() => { setBackup((v) => !v); setErr(''); setCode(''); }}>
          {backup ? '← Ввести код із застосунку' : 'Втратив доступ? Ввести резервний код'}
        </button>
      </p>
    </main>
  );
}
