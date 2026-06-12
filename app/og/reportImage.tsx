import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReportImageData } from '@/lib/reports';

// Рендер картинки-звіту (стрім/збір) у PNG через next/og (satori) — перевірене рішення, не свій рендер.
// Шрифт Onest (кирилична підмножина, woff) читаємо ліниво з диска під час запиту.

let fontsCache: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | null = null;
export function ogFonts() {
  if (!fontsCache) {
    const dir = join(process.cwd(), 'app', 'og', 'fonts');
    fontsCache = [
      { name: 'Onest', data: readFileSync(join(dir, 'onest-400.woff')), weight: 400, style: 'normal' },
      { name: 'Onest', data: readFileSync(join(dir, 'onest-700.woff')), weight: 700, style: 'normal' },
      // Резервний шрифт для гліфів, яких немає в кириличній підмножині Onest (напр. ₴).
      { name: 'DejaVu', data: readFileSync(join(dir, 'DejaVuSans.ttf')), weight: 400, style: 'normal' },
    ];
  }
  return fontsCache;
}

// Токени з globals.css (тепла темна гама).
const C = {
  bg: '#1B1714',
  card: '#241E19',
  card2: '#2B231D',
  line: '#3A2F26',
  ink: '#F3E9DF',
  ink2: '#CDBCAB',
  ink3: '#9A8979',
  accent: '#D0875A',
  accentSoft: '#E2A878',
  gold: '#E0B66B',
};

export function reportImageResponse(d: ReportImageData): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 64,
          backgroundColor: C.bg,
          backgroundImage: `radial-gradient(1100px 520px at 80% -10%, rgba(208,135,90,0.16), transparent 60%)`,
          color: C.ink,
          fontFamily: 'Onest',
        }}
      >
        {/* Бренд + категорія */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(150deg, ${C.accentSoft}, #B66E43)`,
                fontSize: 30,
              }}
            >
              🗺
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>
                <span>Gra</span>
                <span style={{ color: C.accentSoft }}>Mista</span>
              </div>
              <div style={{ fontSize: 16, color: C.ink3 }}>змагання міст України</div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              fontWeight: 700,
              color: C.accentSoft,
              border: `1px solid ${C.line}`,
              borderRadius: 999,
              padding: '8px 20px',
            }}
          >
            {d.kicker}
          </div>
        </div>

        {/* Заголовок + підзаголовок */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>{d.title}</div>
          <div style={{ fontSize: 26, color: C.ink3, marginTop: 10 }}>{d.subtitle}</div>
        </div>

        {/* 3 числа */}
        <div style={{ display: 'flex', gap: 20, marginTop: 44 }}>
          {d.stats.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                backgroundColor: C.card,
                border: `1px solid ${C.line}`,
                borderRadius: 20,
                padding: '24px 28px',
              }}
            >
              <div style={{ fontSize: 42, fontWeight: 700, color: i === 0 ? C.accentSoft : C.ink }}>{s.value}</div>
              <div style={{ fontSize: 20, color: C.ink3, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Топ міст */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          {d.topCities.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', fontSize: 22, color: C.ink3 }}>🏆 Топ міст:</div>
              {d.topCities.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: C.card2,
                    border: `1px solid ${C.line}`,
                    borderRadius: 999,
                    padding: '8px 18px',
                    fontSize: 22,
                  }}
                >
                  <span style={{ color: i === 0 ? C.gold : C.ink2, fontWeight: 700 }}>{i + 1}.</span>
                  <span style={{ color: C.ink }}>{c.name}</span>
                  <span style={{ color: C.accentSoft }}>{c.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: ogFonts(),
    },
  );
}
