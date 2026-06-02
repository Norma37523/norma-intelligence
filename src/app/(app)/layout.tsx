import { requireSession } from '@/features/auth/server';

import { AppShell } from '@/shared/components/layout/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    // Log the real error — visible in Vercel Function Logs
    console.error('[AppLayout] requireSession failed:', err);
    throw err;
  }

  return <AppShell session={session}>{children}</AppShell>;
}
