import './overlay.css';
import type { ReactNode } from 'react';

// Окремий layout оверлеїв — ПОЗА (panel): без операторської шапки/навігації.
// Прозорість і стилі віджетів — у overlay.css. <html>/<body> дає кореневий app/layout.tsx.
export const dynamic = 'force-dynamic';

export default function OverlayLayout({ children }: { children: ReactNode }) {
  return children;
}
