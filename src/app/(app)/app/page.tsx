import type { Metadata } from 'next';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Sparkles,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import { requireSession } from '@/features/auth/server';
import { loadStatement } from '@/features/dre/server';
import { Period } from '@/features/dre/domain/period';
import { listOpenInsights } from '@/features/insights/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { RevenueChart } from '@/features/dre/presentation/revenue-chart';

export const metadata: Metadata = { title: 'Visão geral — Norma Intelligence' };

export default async function DashboardPage() {
  const session = await requireSession();
  const companyId = await pickDefaultCompany(session.currentOrganizationId);

  const [dreData, insights] = await Promise.all([
    companyId ? loadStatement(companyId, Period.current(), 6).catch(() => null) : null,
    companyId ? listOpenInsights(companyId, 4).catch(() => []) : [],
  ]);

  const firstName = session.user.fullName?.split(' ')[0] ?? session.user.email.split('@')[0];
  const hasData = dreData?.hasData ?? false;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Olá, {firstName}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-muted-foreground text-sm">
          {hasData
            ? `Dados até ${Period.current().label()} · DRE consolidado`
            : 'Conecte seus dados financeiros para começar.'}
        </p>
      </div>

      {/* KPI Strip */}
      {hasData && dreData ? (
        <KPIStrip dreData={dreData} />
      ) : (
        <EmptyStateSetup hasCompany={!!companyId} />
      )}

      {/* Charts + Insights grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evolução de receita</CardTitle>
                <CardDescription>Receita bruta e EBITDA — últimos 6 meses</CardDescription>
              </div>
              {hasData && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/dre">
                    Ver DRE completo <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasData && dreData ? (
              <RevenueChart
                revenueGross={dreData.series.revenueGross}
                ebitda={dreData.series.ebitda}
              />
            ) : (
              <ChartPlaceholder />
            )}
          </CardContent>
        </Card>

        {/* Insights panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-7 place-items-center rounded-lg bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <CardTitle className="text-base">Insights recentes</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/insights">
                  Ver todos <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {insights.length === 0 ? (
              <InsightEmptyState hasData={hasData} />
            ) : (
              insights.map((insight) => (
                <InsightRow key={insight.id} insight={insight} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickAction
          href="/app/uploads"
          icon={<Upload className="size-5" />}
          title="Importar dados"
          description="Envie extratos CSV/XLSX para atualizar o DRE"
          color="bg-sky-500/10 text-sky-600"
        />
        <QuickAction
          href="/app/insights"
          icon={<Sparkles className="size-5" />}
          title="Gerar insights"
          description="Analise variações e tendências financeiras com IA"
          color="bg-primary/10 text-primary"
        />
        <QuickAction
          href="/app/dre"
          icon={<TrendingUp className="size-5" />}
          title="DRE gerencial"
          description="Veja o demonstrativo completo por período"
          color="bg-emerald-500/10 text-emerald-600"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* KPI Strip                                                                   */
/* -------------------------------------------------------------------------- */

interface KPIStripProps {
  dreData: NonNullable<Awaited<ReturnType<typeof loadStatement>>>;
}

function KPIStrip({ dreData }: KPIStripProps) {
  const { metrics, comparison } = dreData;

  const kpis = [
    {
      label: 'Receita bruta',
      value: metrics.revenueGross.format('pt-BR'),
      delta: comparison?.delta.revenueGross.percentage ?? null,
      sub: `Líquida: ${metrics.revenueNet.format('pt-BR')}`,
    },
    {
      label: 'Lucro bruto',
      value: metrics.grossProfit.format('pt-BR'),
      delta: comparison?.delta.grossProfit.percentage ?? null,
      sub: `Margem: ${(metrics.grossMargin * 100).toFixed(1)}%`,
    },
    {
      label: 'EBITDA',
      value: metrics.ebitda.format('pt-BR'),
      delta: comparison?.delta.ebitda.percentage ?? null,
      sub: `Margem: ${(metrics.ebitdaMargin * 100).toFixed(1)}%`,
    },
    {
      label: 'Resultado líquido',
      value: metrics.netProfit.format('pt-BR'),
      delta: comparison?.delta.netProfit.percentage ?? null,
      sub: `Margem: ${(metrics.netMargin * 100).toFixed(1)}%`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}

function KPICard({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta: number | null;
  sub: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <DeltaBadge delta={delta} />
          <span className="truncate">{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
        <Minus className="size-3" /> m/m
      </span>
    );
  const positive = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        positive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
      }`}
    >
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? '+' : ''}
      {(delta * 100).toFixed(1)}%
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Insight row                                                                 */
/* -------------------------------------------------------------------------- */

type InsightRow = Awaited<ReturnType<typeof listOpenInsights>>[number];

function InsightRow({ insight }: { insight: InsightRow }) {
  const icon =
    insight.severity === 'critical' ? (
      <AlertTriangle className="size-4 text-destructive" />
    ) : insight.severity === 'warning' ? (
      <AlertTriangle className="size-4 text-amber-500" />
    ) : (
      <CheckCircle2 className="size-4 text-emerald-500" />
    );

  return (
    <div className="flex gap-3 rounded-lg border bg-card/50 p-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 space-y-1">
        <p className="line-clamp-3 text-sm leading-relaxed">{insight.body}</p>
        <p className="text-xs text-muted-foreground">
          <Clock className="mr-1 inline size-3" />
          {insight.createdAt.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

function InsightEmptyState({ hasData }: { hasData: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
      <Sparkles className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        {hasData ? 'Nenhum insight gerado ainda.' : 'Importe dados para gerar insights.'}
      </p>
      {hasData && (
        <Button size="sm" variant="outline" asChild>
          <Link href="/app/insights">Gerar agora</Link>
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                 */
/* -------------------------------------------------------------------------- */

function EmptyStateSetup({ hasCompany }: { hasCompany: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SetupStep
        number={1}
        done={hasCompany}
        title="Crie sua empresa"
        description="Cadastre o CNPJ e regime tributário"
        href="/app/settings"
        cta="Ir para configurações"
      />
      <SetupStep
        number={2}
        done={false}
        title="Importe os dados"
        description="Envie o extrato CSV ou XLSX"
        href="/app/uploads"
        cta="Ir para uploads"
        disabled={!hasCompany}
      />
      <SetupStep
        number={3}
        done={false}
        title="Veja o DRE"
        description="Dashboard e insights automáticos prontos"
        href="/app/dre"
        cta="Ver DRE"
        disabled
      />
    </div>
  );
}

function SetupStep({
  number,
  done,
  title,
  description,
  href,
  cta,
  disabled = false,
}: {
  number: number;
  done: boolean;
  title: string;
  description: string;
  href: string;
  cta: string;
  disabled?: boolean;
}) {
  return (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`grid size-8 place-items-center rounded-full text-sm font-bold ${
              done
                ? 'bg-emerald-500/15 text-emerald-600'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {done ? <CheckCircle2 className="size-4" /> : number}
          </div>
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-xs text-muted-foreground">{description}</p>
        {!done && !disabled && (
          <Button size="sm" variant="outline" asChild className="w-full">
            <Link href={href}>{cta} <ArrowRight className="ml-1 size-3" /></Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick actions                                                               */
/* -------------------------------------------------------------------------- */

function QuickAction({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium group-hover:text-primary">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Chart placeholder                                                           */
/* -------------------------------------------------------------------------- */

function ChartPlaceholder() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
      <TrendingUp className="size-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Importe dados para visualizar o gráfico</p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/app/uploads">Importar agora</Link>
      </Button>
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
