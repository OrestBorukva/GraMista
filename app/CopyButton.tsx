'use client';

import { useState } from 'react';

// Кнопка «копіювати в буфер» (звіт-пост стріму/збору — §17.3/§17.4).
export function CopyButton({ text, label = 'Копіювати' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-find"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // буфер недоступний (немає дозволу/HTTP) — тихо ігноруємо
        }
      }}
    >
      {done ? '✓ Скопійовано' : `📋 ${label}`}
    </button>
  );
}
