'use client';

import { useEffect, useState } from 'react';

// Плашка-онбординг для глядача. Закриття запамʼятовуємо в localStorage (повертатись не набридає).
// Рендеримо тільки після монтування, щоб не було hydration-mismatch із localStorage.
export function HowTo() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(localStorage.getItem('gm-howto-hidden') !== '1');
  }, []);
  if (!show) return null;
  return (
    <div className="pub-panel pub-howto">
      <span><span className="n">1</span> Донать на банку</span>
      <span><span className="n">2</span> Напиши <b>місто</b> в коментарі</span>
      <span><span className="n">3</span> <b>100 ₴ = 1 бал</b> місту</span>
      <button
        type="button"
        className="x"
        aria-label="зрозуміло, сховати"
        onClick={() => {
          localStorage.setItem('gm-howto-hidden', '1');
          setShow(false);
        }}
      >
        ✕
      </button>
    </div>
  );
}
