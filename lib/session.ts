import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';

// Єдине джерело «хто я» в RSC/Server Actions/роутах панелі. Нема сесії → редірект на /login.
export async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return session.user.id;
}

// М'який варіант (без редіректу) — напр. для /api/stream із cookie-сесією.
export async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

// Дзеркало requireUserId для гостьових сторінок (вхід/реєстрація/2FA):
// залогіненого ведемо одразу в панель, форму не показуємо.
export async function redirectIfSignedIn(): Promise<void> {
  if (await getUserId()) redirect('/dashboard');
}
