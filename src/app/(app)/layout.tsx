import { requireSession } from '@/features/auth/server';
import { AppShell } from '@/shared/components/layout/app-shell';

// Todas as rotas autenticadas são dinâmicas por definição
// (usam cookies de sessão — nunca devem ser pre-renderizadas estaticamente)
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AppShell session={session}>{children}</AppShell>;
}
