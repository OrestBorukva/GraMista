'use client';

import { useState } from 'react';
import { CityAutocomplete } from './CityAutocomplete';

// Інлайн-зміна міста ВЖЕ розпізнаному донату (вкладка Донати). За замовчуванням показує назву
// міста + кнопку «✎»; по кліку розкриває CityAutocomplete (реюз) із reassignCityAction (autoSubmit
// + підтвердження, бо бали перераховуються). Батько ремонтить компонент через key={city}, тож
// після успіху редактор закривається й показує нове місто.
export function ReassignCityCell({
  externalId,
  city,
  action,
}: {
  externalId: string;
  city: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <span className="place-edit">
        <span className="place">{city}</span>
        <button type="button" className="place-change" onClick={() => setEditing(true)} title="Змінити місто">
          ✎
        </button>
      </span>
    );
  }

  return (
    <div className="inline-assign">
      <CityAutocomplete
        action={action}
        hidden={{ externalId }}
        placeholder="нове місто…"
        autoSubmit
        confirmMessage={'Перенести бали цього донату в «{city}»? Бали обох міст перерахуються.'}
      />
      <button type="button" className="place-cancel" onClick={() => setEditing(false)} title="Скасувати">
        ✕
      </button>
    </div>
  );
}
