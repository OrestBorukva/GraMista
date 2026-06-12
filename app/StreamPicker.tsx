'use client';

// Перенесення донату в інший стрім: нативний select, авто-сабміт при зміні.
// action і дані — від серверної сторінки (тонкий контролер).

interface StreamOpt {
  id: string;
  name: string;
}

export function StreamPicker({
  action,
  externalId,
  streams,
  current,
}: {
  action: (formData: FormData) => void | Promise<void>;
  externalId: string;
  streams: StreamOpt[];
  current: string | null;
}) {
  return (
    <form action={action} className="stream-picker">
      <input type="hidden" name="externalId" value={externalId} />
      <select
        name="streamId"
        defaultValue={current ?? ''}
        className="fld mini"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        title="Перенести донат в інший стрім"
      >
        <option value="">— без стріму —</option>
        {streams.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </form>
  );
}
