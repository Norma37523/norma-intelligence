import {
  AlertCircle,
  AlertTriangle,
  Info,
  Sparkles,
  TrendingDown,
  TrendingUp,
  LineChart,
  Banknote,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';

import type { Insight, InsightKind, InsightSeverity } from '../domain';
import { DismissAction } from './dismiss-action';

const SEVERITY_STYLES: Record<InsightSeverity, { ring: string; chip: string; icon: LucideIcon; label: string }> = {
  critical: { ring: 'border-l-destructive',         chip: 'bg-destructive/10 text-destructive',         icon: AlertCircle,    label: 'Crítico' },
  warning:  { ring: 'border-l-norma-warning',        chip: 'bg-norma-warning/15 text-norma-warning',    icon: AlertTriangle,  label: 'Atenção' },
  info:     { ring: 'border-l-norma-info',           chip: 'bg-norma-info/15 text-norma-info',          icon: Info,           label: 'Info' },
};

const KIND_ICONS: Record<InsightKind, LucideIcon> = {
  variance_spike:        TrendingUp,
  trend_break:           LineChart,
  ratio_anomaly:         TrendingDown,
  forecast_deviation:    LineChart,
  narrative_summary:     Sparkles,
  reconciliation_alert:  AlertTriangle,
  cash_flow_warning:     Banknote,
};

const ORIGIN_LABEL = {
  rule: 'regra',
  statistic: 'estatística',
  llm: 'IA',
  hybrid: 'estatística + IA',
} as const;

interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const severity = SEVERITY_STYLES[insight.severity];
  const KindIcon = KIND_ICONS[insight.kind];

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-xl border border-l-4 bg-card transition-colors hover:bg-card/80',
        severity.ring,
      )}
    >
      <div className="space-y-3 p-5">
        <header className="flex items-start gap-3">
          <div className={cn('grid size-9 shrink-0 place-items-center rounded-lg', severity.chip)}>
            <KindIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight tracking-tight">
              {insight.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className={cn('rounded-full px-2 py-0.5 font-medium', severity.chip)}>
                <severity.icon className="mr-1 inline size-3" />
                {severity.label}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 opacity-60" />
                {ORIGIN_LABEL[insight.origin]}
              </span>
              {insight.relatedPeriodStart && (
                <>
                  <span>•</span>
                  <span>{insight.relatedPeriodStart.slice(0, 7)}</span>
                </>
              )}
              <span>•</span>
              <span>{new Date(insight.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </header>

        <p className="text-pretty text-sm leading-relaxed text-foreground/90">
          {insight.body}
        </p>

        <details className="group/details">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Ver evidências
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-3 text-[11px] leading-snug">
            {JSON.stringify(insight.evidence, null, 2)}
          </pre>
        </details>

        <footer className="flex items-center justify-end gap-2 pt-1">
          <DismissAction insightId={insight.id} />
        </footer>
      </div>
    </article>
  );
}

export const _Button = Button; // keep import live for downstream usage
