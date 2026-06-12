'use client';

import { useEffect, useState } from 'react';

// Єдине джерело пошуку поселень для клієнтських пікерів (CityAutocomplete):
// дебаунс-запит до /api/settlements. skipName — назва щойно вибраного (щоб не перешукувати).

export interface CityMatch {
  id: string;
  name: string;
  oblast: string | null;
  raion: string | null;
}

export function useSettlementSearch(query: string, skipName?: string): CityMatch[] {
  const [results, setResults] = useState<CityMatch[]>([]);
  useEffect(() => {
    if (skipName !== undefined && query === skipName) return; // щойно вибрали — не перешукувати
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/settlements?q=${encodeURIComponent(q)}`);
        if (r.ok) setResults(await r.json());
      } catch {
        // мережа недоступна — просто без підказок
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, skipName]);
  return results;
}
