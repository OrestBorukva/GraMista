'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface PublicCollectionRow {
  id: string;
  name: string;
  date: string;
  sumUah: string;
}

// Кнопка «🗃 Минулі збори» + випадна панель: назва · зібрано · дата → архівна сторінка збору.
// Рендериться лише якщо є завершені збори (сервер передає вже відфільтровані рядки).
export function CollectionsPanel({ handle, rows }: { handle: string; rows: PublicCollectionRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="pub-hbtn" onClick={() => setOpen((o) => !o)}>🗃 Минулі збори</button>
      {open && (
        <div className="pub-panel pub-streams">
          <div className="pub-ptitle">Минулі збори</div>
          {rows.map((c) => (
            <div className="pub-srow" key={c.id}>
              <Link href={`/${handle}/zbir/${c.id}`}>
                <b>{c.name}</b> · {c.sumUah}
                {c.date && ` · ${c.date}`}
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
