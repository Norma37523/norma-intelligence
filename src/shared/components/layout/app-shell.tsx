import { Building2 } from 'lucide-react';

import type { SessionContext } from '@/features/auth';
import { signOut } from '@/features/auth/application/actions';

import { Button } from '@/shared/components/ui/button';
import { Separator } from '@/shared/components/ui/separator';
import { SidebarNav, SidebarBottomNav } from './sidebar-nav';
import { ThemeToggle } from './theme-toggle';

interface AppShellProps {
  session: SessionContext;
  children: React.ReactNode;
}

export function AppShell({ session, children }: AppShellProps) {
  const orgId = session.currentOrganizationId;
  const orgName = orgId ? orgId.slice(0, 8).toUpperCase() : 'Minha empresa';
  const initial = (session.user.fullName ?? session.user.email)[0]?.toUpperCase() ?? '?';
  const periodLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="grid min-h-screen md:grid-cols-[15rem_1fr]">
      {/* Sidebar */}
      <aside className="hidden flex-col border-r bg-card md:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold tracking-tight">N</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Norma Intelligence</p>
            <p className="truncate text-[10px] text-muted-foreground">FP&amp;A · Contabilidade</p>
          </div>
        </div>

        {/* Org chip */}
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
            {orgName}
          </span>
        </div>

        {/* Main nav (client component) */}
        <SidebarNav />

        <Separator />

        {/* Bottom nav + user */}
        <div className="space-y-2 p-3 pb-4">
          <SidebarBottomNav />

          <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {session.user.fullName ?? session.user.email.split('@')[0]}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{session.user.email}</p>
            </div>
          </div>

          <form action={signOut} className="px-3">
            <Button type="submit" variant="outline" size="sm" className="w-full text-xs">
              Sair
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="text-sm font-medium capitalize text-muted-foreground">{periodLabel}</div>
          <ThemeToggle />
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
