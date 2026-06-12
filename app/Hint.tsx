import type { ReactNode } from 'react';

// Підказка до налаштування: на десктопі — ⓘ зі спливашкою (hover/фокус),
// на телефоні — звичайний текст під полем. Поведінка повністю в CSS (.hint-wrap у globals.css).
export function Hint({ children }: { children: ReactNode }) {
  return (
    <span className="hint-wrap">
      <span className="hint-i" tabIndex={0} aria-label="Підказка">
        i
      </span>
      <span className="hint-pop" role="tooltip">
        {children}
      </span>
    </span>
  );
}
