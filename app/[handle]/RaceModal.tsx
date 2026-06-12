'use client';

import { useEffect, useState } from 'react';
import { formatPoints } from '@/lib/format';
import type { RaceData } from '@/lib/race';

// «Гонка міст»: анімовані смужки крокують по днях (дані з PointEvent через публічний API).
// Без chart-бібліотеки — той самий підхід, що порівняння стрімів (CSS-смужки).
export function RaceModal({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RaceData | null>(null);
  const [day, setDay] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (!data) {
      fetch(`/api/public/${encodeURIComponent(handle)}/race`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!cancelled && d) setData(d as RaceData); })
        .catch(() => {});
    }
    const t = setInterval(() => {
      setDay((d) => (data ? (d + 1) % data.dayLabels.length : 0));
    }, 650);
    return () => { cancelled = true; clearInterval(t); };
  }, [open, data, handle]);

  const maxFinal = data ? Math.max(1, ...data.series.map((s) => s.cumulative[s.cumulative.length - 1] ?? 0)) : 1;

  return (
    <>
      <button type="button" className="pub-texpand" onClick={() => { setOpen(true); setDay(0); }}>
        📈 Гонка міст
      </button>
      {open && (
        <div className="pub-race-bg" onClick={() => setOpen(false)}>
          <div className="pub-panel pub-race" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="x" aria-label="закрити" onClick={() => setOpen(false)}>✕</button>
            <h3>📈 Гонка міст</h3>
            <div className="day">
              {data ? `День ${day + 1} з ${data.dayLabels.length} · ${data.dayLabels[day]}` : 'завантаження…'}
            </div>
            {data && data.series.length === 0 && <div className="pub-empty">за останні 14 днів балів ще не було</div>}
            {data?.series.map((s) => {
              const v = s.cumulative[day] ?? 0;
              return (
                <div className="pub-rrow" key={s.settlementId}>
                  <div className="nm">{s.name}</div>
                  <div className="track">
                    <div className="fill" style={{ width: `${Math.max(6, (v / maxFinal) * 100)}%` }}>
                      {formatPoints(v)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
