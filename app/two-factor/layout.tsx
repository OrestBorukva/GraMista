import type { ReactNode } from 'react';
import { redirectIfSignedIn } from '@/lib/session';

// Сторінка коду 2FA — клієнтський компонент, тож title задаємо через layout.
// До введення коду повної сесії ще немає, тож редірект ловить лише тих, хто вже увійшов.
export const metadata = { title: 'Підтвердження входу' };

export default async function TwoFactorLayout({ children }: { children: ReactNode }) {
  await redirectIfSignedIn();
  return children;
}
