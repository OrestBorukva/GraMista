'use client';

import { useEffect, useState } from 'react';
import { formatPoints } from '@/lib/format';
import { openCity } from './TopCities';

interface SeekHit {
  id: string;
  name: string;
  oblast: string | null;
  raion: string | null;
  place: number | null;
  points: number;
}

// «Знайди своє місто»: дебаунс-пошук по довіднику; з балами → місце/бали (клік відкриває
// картку), без балів → заклик «стань першим». Той самий патерн, що useSettlementSearch.
export function CitySeek({ handle }: { handle: string }) {
  const [q, setQ] = useState('');
  const [hit, setHit] = useState<SeekHit | null | 'none'>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHit(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/public/${encodeURIComponent(handle)}/city-search?q=${encodeURIComponent(query)}`);
        if (!r.ok) return;
        const list = (await r.json()) as SeekHit[];
        setHit(list[0] ?? 'none');
      } catch {
        // мережа недоступна — просто без підказки
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, handle]);

  return (
    <div className="pub-seek">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔎 Знайди своє місто…"
        aria-label="Знайди своє місто"
      />
      <div className="res">
        {hit === 'none' && 'не знайшли такого міста…'}
        {hit && hit !== 'none' && hit.place !== null && (
          <span onClick={() => openCity(hit.id)} style={{ cursor: 'pointer' }}>
            {hit.name}{hit.oblast ? ` (${hit.oblast}${hit.raion ? `, ${hit.raion}` : ''})` : ''} — <b>{hit.place} місце · {formatPoints(hit.points)} б</b>
          </span>
        )}
        {hit && hit !== 'none' && hit.place === null && (
          <span>
            {hit.name}{hit.oblast ? ` (${hit.oblast}${hit.raion ? `, ${hit.raion}` : ''})` : ''} ще без балів.{' '}
            <span className="first">Стань першим — виведи його на мапу!</span>
          </span>
        )}
      </div>
    </div>
  );
}
