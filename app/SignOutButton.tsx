'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

// Спільна кнопка виходу (ряд вкладок панелі, шапка лендингу) — вигляд задає батько через className.
export function SignOutButton({ className, children }: { className?: string; children?: ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    await authClient.signOut();
    // На головну + refresh: серверні компоненти (шапка лендингу) перечитують сесію вже як гість.
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={onClick} disabled={busy} title="Вийти з акаунта">
      {children ?? 'Вийти'}
    </button>
  );
}
