import { requireSession } from '@/features/auth/server';

import { AppShell } from '@/shared/components/layout/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already redirects anonymous users, but we double-check here
  // so Server Components downstream can rely on a guaranteed session.
  const session = await requireSession();

  return <AppShell session={session}>{children}</AppShell>;
}
