import type { ReactNode } from 'react';
import { redirectIfSignedIn } from '@/lib/session';

// Сторінка реєстрації — клієнтський компонент, тож title задаємо через layout.
export const metadata = { title: 'Реєстрація' };

export default async function RegisterLayout({ children }: { children: ReactNode }) {
  await redirectIfSignedIn();
  return children;
}
