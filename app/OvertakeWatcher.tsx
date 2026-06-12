'use client';

import { useEffect, useState } from 'react';
import { overtakeMessage, type RankCity } from '@/lib/overtake';

// Сповіщення про обгін у топі (§17.1 «Київ обігнав Львів»). Дашборд рендериться наново на кожен
// живий донат (LiveRefresh → router.refresh), що РЕ-МАУНТИТЬ цей компонент — тож і базову лінію,
// і саме повідомлення тримаємо на рівні МОДУЛЯ (переживає ре-маунт; useState скидається). Новий
// інстанс одразу читає модульне `pending` і показує плашку. viewKey (період+сортування) скидає
// базову лінію, щоб навігація не давала хибних сповіщень. Лише спадання.
let lastSeen: { order: RankCity[]; viewKey: string } | null = null;
let pendingText: string | null = null;
let pendingUntil = 0;

export function OvertakeWatcher({ order, viewKey }: { order: RankCity[]; viewKey: string }) {
  const [, force] = useState(0);

  // Виявлення обгону при зміні топу.
  useEffect(() => {
    const prev = lastSeen;
    lastSeen = { order, viewKey };
    if (prev && prev.viewKey === viewKey) {
      const m = overtakeMessage(prev.order, order);
      if (m) {
        pendingText = m;
        pendingUntil = Date.now() + 4500;
        force((x) => x + 1);
      }
    }
  }, [order, viewKey]);

  // Авто-сховати по завершенні вікна показу.
  useEffect(() => {
    if (!(pendingText && Date.now() < pendingUntil)) return;
    const t = setTimeout(() => force((x) => x + 1), pendingUntil - Date.now());
    return () => clearTimeout(t);
  });

  const show = pendingText && Date.now() < pendingUntil ? pendingText : null;
  if (!show) return null;
  return (
    <div className="overtake-toast" role="status">
      🔥 {show}
    </div>
  );
}
