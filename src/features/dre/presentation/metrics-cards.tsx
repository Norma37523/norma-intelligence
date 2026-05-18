import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import type { Money } from '@/shared/money/money';

import type { DREComparison, DREMetrics } from '../domain/metrics';

interface MetricsCardsProps {
  metrics: DREMetrics;
  comparison: DREComparison | null;
}

/**
 * Top-row KPIs: Revenue (gross + net), EBITDA, Net Profit + their margins.
 * Compact, scannable, designed for executives.
 */
export function MetricsCards({ metrics, comparison }: MetricsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Receita bruta"
        value={metrics.revenueGross}
        subValue={metrics.revenueNet}
        subLabel="Líquida"
        deltaPct={comparison?.delta.revenueGross.percentage ?? null}
        positiveIsGood
      />
      <MetricCard
        title="Lucro bruto"
        value={metrics.grossProfit}
        marginPct={metrics.grossMargin}
        marginLabel="Margem bruta"
        deltaPct={comparison?.delta.grossProfit.percentage ?? null}
        positiveIsGood
      />
      <MetricCard
        title="EBITDA"
        value={metrics.ebitda}
        marginPct={metrics.ebitdaMargin}
        marginLabel="Margem EBITDA"
        deltaPct={comparison?.delta.ebitda.percentage ?? null}
        positiveIsGood
      />
      <MetricCard
        title="Resultado líquido"
        value={metrics.netProfit}
        marginPct={metrics.netMargin}
        marginLabel="Margem líquida"
        deltaPct={comparison?.delta.netProfit.percentage ?? null}
        positiveIsGood
      />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: Money;
  subValue?: Money;
  subLabel?: string;
  marginPct?: number;
  marginLabel?: string;
  deltaPct: number | null;
  positiveIsGood: boolean;
}

function MetricCard(props: MetricCardProps) {
  const { title, value, subValue, subLabel, marginPct, marginLabel, deltaPct } = props;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold tabular-nums">{value.format('pt-BR')}</p>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <DeltaPill deltaPct={deltaPct} />
          {subValue && subLabel && (
            <span className="tabular-nums">
              {subLabel}: <strong>{subValue.format('pt-BR')}</strong>
            </span>
          )}
          {marginPct !== undefined && marginLabel && (
            <span className="tabular-nums">
              {marginLabel}: <strong>{(marginPct * 100).toFixed(1)}%</strong>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeltaPill({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
        <Minus className="size-3" /> vs. mês anterior
      </span>
    );
  }
  const positive = deltaPct >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
        positive ? 'bg-norma-success/15 text-norma-success' : 'bg-destructive/15 text-destructive',
      )}
    >
      {positive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {(deltaPct * 100).toFixed(1)}%
    </span>
  );
}
