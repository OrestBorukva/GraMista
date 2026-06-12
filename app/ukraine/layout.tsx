import './ukraine.css';
import type { ReactNode } from 'react';

// Глобальна мапа сервісу /ukraine — ПОЗА (panel): без операторської шапки й без сесії.
// <html>/<body> і шрифти дає кореневий app/layout.tsx.
export const dynamic = 'force-dynamic';

export default function UkraineLayout({ children }: { children: ReactNode }) {
  return children;
}
