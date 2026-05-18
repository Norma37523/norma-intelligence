import { Inbox } from 'lucide-react';

import type { Insight, InsightSeverity } from '../domain';
import { InsightCard } from './insight-card';

interface InsightsListProps {
  insights: ReadonlyArray<Insight>;
}

const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  critical: 'Críticos',
  warning: 'Atenção',
  info: 'Informativos',
};

const SEVERITY_ORDER: InsightSeverity[] = ['critical', 'warning', 'info'];

/**
 * Render insights grouped by severity. Within each group, items keep the
 * order they came from the repo (score desc, then created_at desc).
 */
export function InsightsList({ insights }: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border bg-card py-16 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-muted">
          <Inbox className="size-5 text-muted-foreground" />
        </div>
        <h2 className="mt-3 text-lg font-semibold">Nenhum insight aberto</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Quando algo relevante aparecer no seu DRE, vamos sinalizar aqui.
        </p>
      </div>
    );
  }

  const grouped = new Map<InsightSeverity, Insight[]>();
  for (const sev of SEVERITY_ORDER) grouped.set(sev, []);
  for (const i of insights) grouped.get(i.severity)?.push(i);

  return (
    <div className="space-y-8">
      {SEVERITY_ORDER.map((sev) => {
        const items = grouped.get(sev) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={sev} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {SEVERITY_LABEL[sev]}
              </h2>
              <span className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? 'achado' : 'achados'}
              </span>
            </div>
            <div className="grid gap-3">
              {items.map((i) => (
                <InsightCard key={i.id} insight={i} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
