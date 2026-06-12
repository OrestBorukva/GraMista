'use client';

import { useEffect, useState } from 'react';
import { formatUah } from '@/lib/format';
import type { GlobalCityDetail } from '@/lib/globalMap';

// Картка міста /ukraine: слухає 'gramista:city', тягне /api/ukraine/city/<id> — розбивка ₴ по
// стрімерах (лінки на /<handle>) + останні донати (анонімно, без текстів). Донату тут нема:
// підтримка йде через сторінки стрімерів або «збір у фокусі».
export function GlobalCityCard() {
  const [card, setCard] = useState<GlobalCityDetail | null>(null);

  useEffect(() => {
    const onCity = async (e: Event) => {
      const id = (e as CustomEvent<{ settlementId: string }>).detail?.settlementId;
      if (!id) return;
      try {
        const r = await fetch(`/api/ukraine/city/${encodeURIComponent(id)}`);
        if (!r.ok) return;
        setCard((await r.json()) as GlobalCityDetail);
      } catch {
        // мережа недоступна — картку просто не відкриваємо
      }
    };
    window.addEventListener('gramista:city', onCity);
    return () => window.removeEventListener('gramista:city', onCity);
  }, []);

  if (!card) return null;
  return (
    <aside className="ukr-panel ukr-citycard" aria-label={`Місто ${card.name}`}>
      <button type="button" className="x" aria-label="закрити" onClick={() => setCard(null)}>✕</button>
      <h3>{card.name}</h3>
      {card.oblast && <div className="obl">{card.oblast}</div>}
      <div className="csum">{formatUah(card.totalUah)} <small>· разом від міста</small></div>
      {card.byStreamer.length > 0 && (
        <>
          <div className="sec">Через стрімерів</div>
          {card.byStreamer.map((s) => (
            <div className="brow" key={s.handle}>
              <a href={`/${s.handle}`} target="_blank" rel="noreferrer">{s.name}</a>
              <span className="a">{formatUah(s.sumUah)}</span>
            </div>
          ))}
        </>
      )}
      {card.recent.length > 0 && (
        <>
          <div className="sec">Останні донати</div>
          {card.recent.map((d, i) => (
            <div className="cdon" key={i}>
              <span>{d.who}</span>
              <span className="a">+{formatUah(d.amountUah)}</span>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}
