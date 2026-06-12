'use client';

import type { ReactNode } from 'react';

// Кнопка submit із підтвердженням (для незворотних дій, напр. видалення).
// Працює всередині форми з Server Action: на «Скасувати» блокує сабміт.
export function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
