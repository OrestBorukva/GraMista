'use client';

import { useState } from 'react';

// «Поділитись»: системний шит (Web Share API — мобільні) або копіювання посилання (десктоп).
// Вбудовані можливості браузера — без бібліотек.
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="pub-hbtn"
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
          } catch {
            // користувач закрив шит — це не помилка
          }
          return;
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? '✓ Скопійовано' : '↗ Поділитись'}
    </button>
  );
}
