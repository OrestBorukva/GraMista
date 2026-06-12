// Шина NOTIFY веб↔воркер. Payload = "<userId>:<externalId>" — щоб SSE-слухач відбирав лише
// донати свого стрімера (мультитенант). userId — cuid (без ':'), тож ділимо по ПЕРШІЙ ':'.
export function encodeDonationNotify(userId: string, externalId: string): string {
  return `${userId}:${externalId}`;
}

export function parseDonationNotify(payload: string): { userId: string; externalId: string } | null {
  const i = payload.indexOf(':');
  if (i <= 0 || i === payload.length - 1) return null;
  return { userId: payload.slice(0, i), externalId: payload.slice(i + 1) };
}

/** Службова «подія без донату»: будить SSE-слухачів стрімера (перемкнувся активний збір тощо). */
export const REFRESH_EVENT_ID = '__refresh__';
