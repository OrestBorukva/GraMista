'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@/app/SignOutButton';

// Головна навігація панелі (§17). Активна вкладка підсвічується за поточним шляхом —
// тому компонент клієнтський (usePathname). Самі дані вкладок тягне кожна сторінка з lib/.
type Tab = { href: string; label: string; icon: string; exact?: boolean };

const TABS: Tab[] = [
  { href: '/dashboard', label: 'Дашборд', icon: '📊' },
  { href: '/donations', label: 'Донати', icon: '💛' },
  { href: '/streams', label: 'Стріми', icon: '🎬' },
  { href: '/collections', label: 'Збори', icon: '🎯' },
  { href: '/overlays', label: 'Оверлеї', icon: '📺' },
  { href: '/admin', label: 'Адмінка', icon: '⚙' },
  { href: '/settings', label: 'Налаштування', icon: '🔧' },
];

// Вкладка адмінки СЕРВІСУ — лише для ролі admin (показ; справжній гейт — на сторінці).
const SERVICE_TAB: Tab = { href: '/service', label: 'Сервіс', icon: '🛡' };

export function TabNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const path = usePathname();
  const tabs = isAdmin ? [...TABS, SERVICE_TAB] : TABS;
  return (
    <nav className="tabnav">
      {tabs.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? 'active' : undefined}>
            <span className="tic">{t.icon}</span> {t.label}
          </Link>
        );
      })}
      <SignOutButton className="tab-out">
        <span className="tic">🚪</span> Вийти
      </SignOutButton>
    </nav>
  );
}
