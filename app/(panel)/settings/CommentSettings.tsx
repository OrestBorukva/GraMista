'use client';
import { useState, useTransition } from 'react';
import type { CommentMode, WordLists } from '@/lib/censor';
import {
  setCommentModeAction,
  setShowCommentPublicAction,
  banWordAction,
  unbanWordAction,
  restoreWordAction,
} from './actions';

const MODE_LABELS: { value: CommentMode; label: string }[] = [
  { value: 'mask', label: 'Повний текст, мат — зірочками (х****)' },
  { value: 'replace', label: 'Повний текст, мат — як [цензура]' },
  { value: 'city', label: 'Тільки розпізнане місто, без вільного тексту' },
  { value: 'hide', label: 'Повністю приховати коментарі' },
];

// Чіп слова з хрестиком: дія приходить готовою, текст лишається оригінальним стемом.
function Chip({ word, onRemove }: { word: string; onRemove: () => void }) {
  return (
    <span className="chip">
      {word}
      <button type="button" aria-label={`Прибрати «${word}»`} onClick={onRemove}>✕</button>
    </span>
  );
}

export function CommentSettings({ mode, showPublic, lists }: { mode: CommentMode; showPublic: boolean; lists: WordLists }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState('');
  const [baseOpen, setBaseOpen] = useState(false);

  // revalidatePath перечитує серверну сторінку — пропси завжди свіжі (контрольовані прямо з них).
  const run = (fn: () => Promise<void>) => startTransition(() => { void fn(); });

  const addWord = () => {
    const w = draft.trim();
    if (w.length < 2) return;
    run(() => banWordAction(w));
    setDraft('');
  };

  return (
    <div className="set-section" style={{ opacity: pending ? 0.6 : 1 }}>
      <div className="set-group">
        <span className="hint">Що показувати з коментаря</span>
        {MODE_LABELS.map(({ value, label }) => (
          <label key={value} className="set-row">
            <input
              type="radio"
              name="commentMode"
              checked={mode === value}
              onChange={() => run(() => setCommentModeAction(value))}
            />
            {label}
          </label>
        ))}
      </div>

      <label className="set-row">
        <input
          type="checkbox"
          checked={showPublic}
          onChange={(e) => run(() => setShowCommentPublicAction(e.target.checked))}
        />
        Показувати коментарі у стрічці публічної сторінки
      </label>

      <div className="set-group">
        <span className="hint">Заборонені слова</span>
        <div className="set-add">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(); } }}
            placeholder="Додати слово…"
          />
          <button type="button" onClick={addWord}>Додати</button>
        </div>

        <div className="chips">
          {lists.custom.length === 0 && <span className="hint">власних слів поки немає</span>}
          {lists.custom.map((w) => (
            <Chip key={w} word={w} onRemove={() => run(() => unbanWordAction(w))} />
          ))}
        </div>

        <button type="button" className="set-toggle" onClick={() => setBaseOpen((v) => !v)}>
          Вбудовані слова ({lists.base.length}) {baseOpen ? '▾' : '▸'}
        </button>
        {baseOpen && (
          <div className="chips">
            {lists.base.map((w) => (
              <Chip key={w} word={w} onRemove={() => run(() => unbanWordAction(w))} />
            ))}
          </div>
        )}
        <span className="hint">
          Вбудований список — корені слів: «пизд» ловить і «пиздець», і «допизділся».
          Видалене вбудоване слово потрапляє у винятки нижче.
        </span>
      </div>

      <div className="set-group">
        <span className="hint">Винятки (не цензуруються)</span>
        <div className="chips">
          {lists.exceptions.length === 0 && (
            <span className="hint">поки порожньо — видали слово зі списку вище, і воно зʼявиться тут</span>
          )}
          {lists.exceptions.map((w) => (
            <Chip key={w} word={w} onRemove={() => run(() => restoreWordAction(w))} />
          ))}
        </div>
      </div>
    </div>
  );
}
