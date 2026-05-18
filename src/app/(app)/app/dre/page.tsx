import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox } from 'lucide-react';

import { requireSession } from '@/features/auth/server';
import {
  MetricsCards,
  DRETable,
  ComparativeChart,
  PeriodSelector,
  Period,
} from '@/features/dre';
import { loadStatement } from '@/features/dre/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';

export const metadata: Metadata = { title: 'DRE Gerencial' };

interface PageProps {
  searchParams: Promise<{ months?: string; period?: string }>;
}

export default async function DREPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = await searchParams;

  const months = clamp(Number(params.months ?? '12'), 1, 24);
  const endPeriod = params.period ? Period.fromString(params.period) : Period.current();

  const companyId = await pickDefaultCompany(session.currentOrganizationId);
  if (!companyId) {
    return <SetupRequired />;
  }

  const loaded = await loadStatement(companyId, endPeriod, months);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">DRE Gerencial</h1>
          <p className="mt-2 text-muted-foreground">
            Período encerrando em <strong>{endPeriod.label()}</strong> · {months}{' '}
            {months === 1 ? 'mês' : 'meses'} de histórico.
          </p>
        </div>
        <PeriodSelector activeMonths={months} />
      </header>

      {!loaded.hasData ? (
        <EmptyState />
      ) : (
        <>
          <MetricsCards metrics={loaded.metrics} comparison={loaded.comparison} />

          <Card>
            <CardHeader>
              <CardTitle>Evolução mensal</CardTitle>
              <CardDescription>
                Receita bruta, EBITDA e Resultado líquido — visão consolidada do período.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComparativeChart
                revenueGross={loaded.series.revenueGross}
                ebitda={loaded.series.ebitda}
                netProfit={loaded.series.netProfit}
              />
            </CardContent>
          </Card>

          <DRETable view={loaded.comparative} />
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n) || n < min) return min;
  if (n > max) return max;
  return Math.floor(n);
}

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
      <h1 className="text-3xl font-semibold tracking-tight">DRE Gerencial</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configure uma empresa</CardTitle>
          <CardDescription>
            Para gerar o DRE você precisa de pelo menos uma empresa cadastrada com plano de
            contas e lançamentos.
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

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-muted">
          <Inbox className="size-5 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Sem dados para o período</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Importe um extrato ou razão contábil em <strong>Uploads</strong> para começar a ver
          o DRE.
        </p>
        <Button asChild className="mt-2">
          <Link href="/app/uploads">Importar dados</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
