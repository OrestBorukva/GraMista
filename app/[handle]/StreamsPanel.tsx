'use client';

import { useState } from 'react';

export interface PublicStreamRow {
  id: string;
  name: string;
  date: string;
  sumUah: string;
  url: string | null;
}

// Кнопка «🎬 Стріми» + випадна панель з минулими стрімами (посилання на записи).
// Рендериться лише якщо стрімер не вимкнув показ (publicShowStreams) і стріми є —
// це вирішує сервер (сюди приходять уже відфільтровані рядки).
export function StreamsPanel({ rows }: { rows: PublicStreamRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="pub-hbtn" onClick={() => setOpen((o) => !o)}>🎬 Стріми</button>
      {open && (
        <div className="pub-panel pub-streams">
          <div className="pub-ptitle">Минулі стріми</div>
          {rows.map((s) => (
            <div className="pub-srow" key={s.id}>
              <b>{s.name}</b> · {s.date} · {s.sumUah}
              {s.url && <a href={s.url} target="_blank" rel="noreferrer">▶ запис</a>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
