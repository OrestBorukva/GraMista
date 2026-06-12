import { notFound } from 'next/navigation';
import { prisma } from './db';
import { requireUserId } from './session';

// Гейт адміна СЕРВІСУ (не плутати з «Адмінкою» стрімера §17.5). Роль читається з БД за
// сесією; неадмінам — 404 (не 403: не підказуємо, що сторінка існує). Ролі змінюються
// лише вручну в БД — API для цього свідомо немає. Спека global-map §3.
export async function requireServiceAdmin(): Promise<string> {
  const userId = await requireUserId();
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (u?.role !== 'admin') notFound();
  return userId;
}

/** Чи є користувач адміном сервісу (для умовного показу навігації — НЕ заміна гейту). */
export async function isServiceAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === 'admin';
}
