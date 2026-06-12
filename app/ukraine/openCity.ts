'use client';

// Клік на місто (крапка мапи / рядок топу / стрімер у картці) → подія картки міста.
// GlobalCityCard слухає 'gramista:city' (патерн публічної сторінки стрімера).
export function openCity(settlementId: string): void {
  window.dispatchEvent(new CustomEvent('gramista:city', { detail: { settlementId } }));
}
