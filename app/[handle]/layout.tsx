import './public.css';
import type { ReactNode } from 'react';

// Публічна сторінка стрімера (§18) — ПОЗА (panel): без операторської шапки й без сесії.
// <html>/<body> і шрифти дає кореневий app/layout.tsx.
export const dynamic = 'force-dynamic';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return children;
}
