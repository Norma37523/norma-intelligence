import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { requireSession } from '@/features/auth/server';
import { InsightsList, GenerateButton } from '@/features/insights';
import { listOpenInsights } from '@/features/insights/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { serverEnv } from '@/shared/config/env';

export const metadata: Metadata = { title: 'Insights' };

export default async function InsightsPage() {
  const session = await requireSession();

  const companyId = await pickDefaultCompany(session.currentOrganizationId);
  if (!companyId) return <SetupRequired />;

  const insights = await listOpenInsights(companyId, 50);
  const llmConfigured = Boolean(serverEnv.ANTHROPIC_API_KEY);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Achados gerados automaticamente sobre o seu DRE — variações relevantes, quebras de
            tendência, anomalias de margem e sinais de alerta de caixa.
            {!llmConfigured && (
              <>
                {' '}
                <em className="text-foreground/70">
                  (Configure <code className="rounded bg-muted px-1 py-0.5">ANTHROPIC_API_KEY</code>{' '}
                  para narrativas estilo consultor.)
                </em>
              </>
            )}
          </p>
        </div>
        <GenerateButton companyId={companyId} months={12} />
      </header>

      {insights.length === 0 ? (
        <FirstRunHint llmConfigured={llmConfigured} />
      ) : (
        <InsightsList insights={insights} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

async function pickDefaultCompany(organizationId: string | null): Promise<string | null> {
  if (!organizationId) return null;
  const { createSupabaseServerClient } = await import('@/shared/supabase/server');
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<{ id: string } | null>();
  return data?.id ?? null;
}

function SetupRequired() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configure uma empresa</CardTitle>
          <CardDescription>
            Para gerar insights você precisa de pelo menos uma empresa cadastrada e dados
            financeiros importados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/settings">Ir para configurações</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FirstRunHint({ llmConfigured }: { llmConfigured: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </div>
        <h2 className="text-lg font-semibold">Pronto para o primeiro diagnóstico?</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Clique em <strong>Gerar insights</strong> para que o motor analise os últimos 12 meses
          do seu DRE e destaque o que merece atenção
          {llmConfigured
            ? ' — com narrativas estilo consultor financeiro.'
            : '.'}
        </p>
        {!llmConfigured && (
          <p className="text-xs text-muted-foreground">
            (Adicione <code className="rounded bg-muted px-1 py-0.5">ANTHROPIC_API_KEY</code> em
            <code className="ml-1 rounded bg-muted px-1 py-0.5">.env.local</code> para habilitar IA.)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
