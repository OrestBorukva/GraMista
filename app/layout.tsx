import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  // База для абсолютних OG/twitter-URL (картинки-прев'ю шерингу). APP_BASE_URL уже є на
  // проді (compose) і потрібен monobank-вебхуку, тож друге джерело істини не заводимо.
  metadataBase: new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000'),
  // Шаблон додає « · GraMista» до title кожної сторінки, що задає свій короткий title
  // (напр. «Дашборд» → «Дашборд · GraMista»). Сторінки без title дістають default.
  // Публічні сторінки (лендинг/ukraine/<handle>/zbir) задають повний title через absolute.
  title: {
    default: 'GraMista — гейміфікація донатів через змагання міст України',
    template: '%s · GraMista',
  },
  description: 'Гейміфікація донатів через змагання міст України',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Onest:wght@400;500;600;700&display=swap&subset=cyrillic,cyrillic-ext,latin"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
