'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSettlementSearch, type CityMatch as Match } from './useSettlementSearch';

// Автодоповнення міста (Адмінка §17.5). Пошук — спільний хук useSettlementSearch; вибір зі списку
// заповнює прихований settlementId (контрольований — value={chosen.id}, щоб коректно
// серіалізуватись у Server Action). Режими:
//  - autoSubmit: вибір одразу надсилає форму (призначення міста, скидання міста);
//  - інакше: вибір лише заповнює; форму надсилає кнопка buttonLabel (напр. ±бали з полем points).
// action і hidden — від серверної сторінки; children — додаткові поля форми (напр. input points).

export function CityAutocomplete({
  action,
  hidden = {},
  placeholder,
  autoSubmit = false,
  confirmMessage,
  buttonLabel,
  formId,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  placeholder?: string;
  autoSubmit?: boolean;
  confirmMessage?: string;
  buttonLabel?: string;
  /** id форми — щоб зовнішні поля (напр. чекбокси) приєднались через атрибут `form` (без вкладених форм). */
  formId?: string;
  children?: ReactNode;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Match | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const results = useSettlementSearch(q, chosen?.name);

  // Відкривати випадайку, коли є підказки; ховати, коли немає. На вибір (results незмінні —
  // хук пропускає пошук) ефект не спрацьовує, тож setOpen(false) з onClick лишається чинним.
  useEffect(() => {
    setOpen(results.length > 0);
  }, [results]);

  // Авто-сабміт — лише ПІСЛЯ ре-рендеру (коли прихований settlementId уже = chosen.id).
  useEffect(() => {
    if (!autoSubmit || !chosen) return;
    if (confirmMessage && !window.confirm(confirmMessage.replace('{city}', chosen.name))) {
      setChosen(null);
      setQ('');
      return;
    }
    formRef.current?.requestSubmit();
  }, [chosen, autoSubmit, confirmMessage]);

  return (
    <form action={action} className="ac" ref={formRef} {...(formId ? { id: formId } : {})}>
      {Object.entries(hidden).map(([k, v]) => (
        <input type="hidden" name={k} value={v} key={k} />
      ))}
      <input type="hidden" name="settlementId" value={chosen?.id ?? ''} readOnly />
      <div className="ac-box">
        <input
          type="text"
          className="fld"
          placeholder={placeholder ?? 'почни вводити місто…'}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setChosen(null);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
        />
        {open && results.length > 0 && (
          <div className="ac-menu">
            {results.map((s) => (
              <button
                type="button"
                className="ac-item"
                key={s.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(s.name);
                  setOpen(false);
                  setChosen(s);
                }}
              >
                <b>{s.name}</b>
                {s.oblast && <span>{s.oblast}{s.raion ? `, ${s.raion}` : ''}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
      {!autoSubmit && buttonLabel && (
        <button type="submit" className="btn-find" disabled={!chosen}>
          {buttonLabel}
        </button>
      )}
    </form>
  );
}
