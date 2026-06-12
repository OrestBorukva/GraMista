import type { ReactNode } from 'react';
import { redirectIfSignedIn } from '@/lib/session';

// Сторінка входу — клієнтський компонент, тож title задаємо через layout (метадані лише в серверних модулях).
export const metadata = { title: 'Вхід' };

export default async function LoginLayout({ children }: { children: ReactNode }) {
  await redirectIfSignedIn();
  return children;
}
