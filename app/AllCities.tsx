'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPoints, pluralMist } from '@/lib/format';

interface City {
  settlementId: string;
  name: string;
  points: number;
}

/** «Усі міста» — багатоколонкова сітка з клієнтським пошуком. Ранг — за повним списком. */
export function AllCities({ cities }: { cities: City[] }) {
  const [q, setQ] = useState('');
  // На телефоні список згорнутий до перших кількох (CSS-clamp). Кнопка нижче розгортає.
  // На десктопі clamp/кнопка не діють — список багатоколонковий зі своїм скролом.
  const [showAll, setShowAll] = useState(false);
  const norm = q.trim().toLowerCase();
  const ranked = cities.map((c, i) => ({ ...c, rank: i + 1 }));
  const shown = norm ? ranked.filter((c) => c.name.toLowerCase().includes(norm)) : ranked;
  // Згортаємо лише без активного пошуку — інакше ховали б знайдене.
  const clamped = !norm && !showAll;

  return (
    <section className="card all-card">
      <div className="card-head">
        <div className="card-title">
          <span className="ic">📋</span> Усі міста
        </div>
        <div className="card-hint">
          {cities.length} {pluralMist(cities.length)}
        </div>
      </div>
      <div className="filter">
        🔎 <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="знайти місто…" />
      </div>
      <div className={`all-scroll scroll${clamped ? ' clamped' : ''}`}>
        {shown.length === 0 ? (
          <div className="empty">{cities.length === 0 ? 'міст із балами ще немає' : 'нічого не знайдено'}</div>
        ) : (
          shown.map((c) => (
            <Link className="mini" key={c.settlementId} href={`/city/${c.settlementId}`}>
              <span className="mrank">{c.rank}</span>
              <span className="mcity">{c.name}</span>
              <span className="mpts">{formatPoints(c.points)}</span>
            </Link>
          ))
        )}
      </div>
      {clamped && shown.length > 5 && (
        <button type="button" className="show-more" onClick={() => setShowAll(true)}>
          ↓ показати всі {cities.length} {pluralMist(cities.length)}
        </button>
      )}
    </section>
  );
}
