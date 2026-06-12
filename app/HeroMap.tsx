'use client';

import { MapUkraine } from '@/app/MapUkraine';
import type { MapPoint } from '@/lib/map';

// Жива мапа в hero лендингу: справжній MapUkraine із «запаленими» містами глобальної мапи
// (без контролів, без кліку). Декоративна — показує реальний продукт замість заглушки.
export function HeroMap({ points }: { points: MapPoint[] }) {
  return (
    <div className="hero-map">
      <MapUkraine points={points} showControls={false} initialLabels="none" />
    </div>
  );
}
