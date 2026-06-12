// Чиста логіка «обгону» в топі (§17.1) — БЕЗ Prisma, щоб безпечно імпортувати в клієнт.

export interface RankCity {
  id: string;
  name: string;
}

/**
 * Повідомлення про обгін у топі («Київ обігнав Львів») — повертає текст, якщо змінився
 * лідер (#1), інакше null. Порядок prev/next — спадання (більші зверху).
 */
export function overtakeMessage(prev: RankCity[], next: RankCity[]): string | null {
  const oldLeader = prev[0];
  const newLeader = next[0];
  if (!oldLeader || !newLeader || oldLeader.id === newLeader.id) return null;
  return `${newLeader.name} обігнав ${oldLeader.name}`;
}
