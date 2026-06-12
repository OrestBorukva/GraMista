'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

// Конфеті, коли активний збір перетинає 100% НАЖИВО (percent зростає між рефрешами).
// Попередній відсоток — на рівні модуля: router.refresh ре-маунтить компонент
// (той самий патерн, що CountUp/OvertakeWatcher). На перший рендер не стріляємо.
let lastPercent: number | null = null;

export function GoalCelebration({ percent }: { percent: number }) {
  useEffect(() => {
    const prev = lastPercent;
    lastPercent = percent;
    if (prev !== null && prev < 100 && percent >= 100) {
      confetti({ particleCount: 160, spread: 75, origin: { y: 0.8 } });
    }
  }, [percent]);
  return null;
}
