# Геодані фону мапи

`ukraine-oblasts.geojson` — межі областей України (ADM1), спрощені для легкого фону мапи.

- **Джерело:** geoBoundaries (gbOpen), набір UKR ADM1.
- **Ліцензія:** CC BY 4.0 — потребує атрибуції «geoBoundaries» (виводиться в `attributionControl` мапи).
- **Обробка:** спрощено через `mapshaper` (`-simplify 8% keep-shapes -clean`, precision 0.001), лишено поле `shapeName` (англ.) + додано `nameUa` (укр. назва області для підписів на мапі; Київ-місто і Севастополь — порожні, щоб не дублювати/тіснити). `ukraine-outline.geojson` — дисольвнутий контур країни.
