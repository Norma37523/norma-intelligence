import type { Metadata } from 'next';
import { TrendingUp, BarChart2, Zap, LineChart, Calculator, FlaskConical } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { requireSession } from '@/features/auth/server';
import { ForecastSkeleton } from '@/features/forecast/presentation/forecast-skeleton';

export const metadata: Metadata = { title: 'Forecast' };

export default async function ForecastPage() {
  await requireSession();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Forecast</h1>
          <Badge variant="secondary" className="text-xs">Em desenvolvimento</Badge>
        </div>
        <p className="text-muted-foreground">
          Projeções financeiras por métrica, modelo e cenário — baseline, otimista, pessimista.
        </p>
      </div>

      {/* Scenario cards scaffold */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ScenarioCard
          scenario="Baseline"
          description="Projeção conservadora baseada em sazonalidade histórica e crescimento médio."
          color="bg-primary/10 text-primary"
          icon={<TrendingUp className="size-5" />}
          badge="Disponível em breve"
        />
        <ScenarioCard
          scenario="Otimista"
          description="Assume aceleração de receita via pipeline comercial e eficiência operacional."
          color="bg-emerald-500/10 text-emerald-600"
          icon={<Zap className="size-5" />}
          badge="Disponível em breve"
        />
        <ScenarioCard
          scenario="Pessimista"
          description="Simula churn de clientes chave, pressão de margem e atrasos de recebimento."
          color="bg-amber-500/10 text-amber-600"
          icon={<BarChart2 className="size-5" />}
          badge="Disponível em breve"
        />
      </div>

      {/* Projection placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projeção de receita — próximos 12 meses</CardTitle>
              <CardDescription>Gráfico de forecast com banda de confiança (P10 / P50 / P90)</CardDescription>
            </div>
            <Badge variant="outline">Em breve</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ForecastSkeleton />
        </CardContent>
      </Card>

      <Separator />

      {/* Planned modules */}
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Módulos planejados
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Module
            icon={<LineChart className="size-4" />}
            title="Modelo linear + sazonal"
            description="Decomposição trend + sazonalidade + ruído via regressão histórica."
            status="em breve"
          />
          <Module
            icon={<Calculator className="size-4" />}
            title="Driver-based forecast"
            description="Projeção top-down baseada em drivers de receita (# clientes × ticket médio)."
            status="em breve"
          />
          <Module
            icon={<FlaskConical className="size-4" />}
            title="Cenários what-if"
            description="Simule o impacto de decisões (novo contrato, corte de equipe, etc.)."
            status="em breve"
          />
          <Module
            icon={<TrendingUp className="size-4" />}
            title="Pipeline comercial"
            description="Conecte oportunidades do CRM para refinar a projeção de receita."
            status="em breve"
          />
          <Module
            icon={<BarChart2 className="size-4" />}
            title="Cash flow forecast"
            description="Projeção de caixa com PMR, PMP e sazonalidade de pagamentos."
            status="em breve"
          />
          <Module
            icon={<Zap className="size-4" />}
            title="Budget vs Forecast"
            description="Desvios entre orçamento aprovado e projeção atualizada mês a mês."
            status="em breve"
          />
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  description,
  color,
  icon,
  badge,
}: {
  scenario: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  badge: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className={`grid size-9 place-items-center rounded-lg ${color}`}>{icon}</div>
          <Badge variant="secondary" className="text-xs shrink-0">{badge}</Badge>
        </div>
        <CardTitle className="text-base mt-2">{scenario}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Module({
  icon,
  title,
  description,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{title}</p>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Badge variant="outline" className="text-[10px]">{status}</Badge>
      </div>
    </div>
  );
}
