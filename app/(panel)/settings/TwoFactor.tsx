'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { authClient } from '@/lib/auth-client';

// Секція «Безпека» в /settings: увімкнення/вимкнення 2FA (TOTP).
// enable({password}) → {totpURI, backupCodes} → показуємо QR + коди → verifyTotp({code}).
export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'enabling' | 'confirm' | 'disabling'>('idle');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function startEnable(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    setPassword('');
    if (error || !data) { setErr(error?.message ?? 'Не вдалося — перевір пароль'); return; }
    setBackupCodes(data.backupCodes);
    setQr(await QRCode.toDataURL(data.totpURI, { margin: 1 }));
    setMode('confirm');
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (error) { setErr('Невірний код — спробуй ще раз'); return; }
    setMode('idle'); setCode(''); setQr(null); setBackupCodes([]);
    router.refresh();
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setBusy(false);
    setPassword('');
    if (error) { setErr(error.message ?? 'Не вдалося — перевір пароль'); return; }
    setMode('idle');
    router.refresh();
  }

  if (enabled && mode !== 'disabling') {
    return (
      <div>
        <p>✅ Двофакторна автентифікація <b>увімкнена</b>.</p>
        <button type="button" onClick={() => { setErr(''); setMode('disabling'); }}>Вимкнути 2FA</button>
      </div>
    );
  }

  if (mode === 'disabling') {
    return (
      <form onSubmit={disable}>
        <p>Підтверди паролем, щоб вимкнути 2FA:</p>
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" disabled={busy}>{busy ? '…' : 'Вимкнути'}</button>{' '}
        <button type="button" onClick={() => { setMode('idle'); setPassword(''); setErr(''); }}>Скасувати</button>
      </form>
    );
  }

  if (mode === 'confirm') {
    return (
      <div>
        <p>1. Відскануй QR у застосунку-автентифікаторі (Google Authenticator, Authy тощо):</p>
        {qr && <img src={qr} alt="QR для 2FA" width={180} height={180} />}
        <p>2. Збережи резервні коди (вхід, якщо втратиш телефон):</p>
        <pre style={{ background: 'var(--card-2, #2B231D)', padding: 10, borderRadius: 8, fontSize: 13 }}>
          {backupCodes.join('\n')}
        </pre>
        <form onSubmit={confirmEnable}>
          <p>3. Введи код із застосунку, щоб завершити:</p>
          <input inputMode="numeric" autoComplete="one-time-code" placeholder="Код (6 цифр)" value={code} onChange={(e) => setCode(e.target.value.trim())} required />
          {err && <p className="auth-err">{err}</p>}
          <button type="submit" disabled={busy}>{busy ? '…' : 'Увімкнути 2FA'}</button>
        </form>
      </div>
    );
  }

  // mode === 'idle', не увімкнено
  if (mode === 'enabling') {
    return (
      <form onSubmit={startEnable}>
        <p>Підтверди паролем, щоб почати:</p>
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p className="auth-err">{err}</p>}
        <button type="submit" disabled={busy}>{busy ? '…' : 'Далі'}</button>{' '}
        <button type="button" onClick={() => { setMode('idle'); setPassword(''); setErr(''); }}>Скасувати</button>
      </form>
    );
  }

  return (
    <div>
      <p>Двофакторна автентифікація вимкнена. Захисти акаунт кодом із застосунку.</p>
      <button type="button" onClick={() => { setErr(''); setMode('enabling'); }}>Увімкнути 2FA</button>
    </div>
  );
}
