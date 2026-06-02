'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LineChart,
  Settings,
  Sparkles,
  LayoutDashboard,
  Upload,
} from 'lucide-react';

import { cn } from '@/shared/lib/utils';

const NAV_ITEMS = [
  { href: '/app', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/app/uploads', label: 'Uploads', icon: Upload, exact: false },
  { href: '/app/dre', label: 'DRE Gerencial', icon: BarChart3, exact: false },
  { href: '/app/forecast', label: 'Forecast', icon: LineChart, exact: false },
  { href: '/app/insights', label: 'Insights', icon: Sparkles, exact: false },
] as const;

const BOTTOM_ITEMS = [
  { href: '/app/settings', label: 'Configurações', icon: Settings, exact: false },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
      {label}
    </Link>
  );
}

export function SidebarNav() {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Plataforma
      </p>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}

export function SidebarBottomNav() {
  return (
    <>
      {BOTTOM_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </>
  );
}
