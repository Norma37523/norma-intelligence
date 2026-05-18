import { cn } from '@/shared/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

import type { ComparativeView } from '../application/compare-periods';
import { Period } from '../domain/period';

interface DRETableProps {
  view: ComparativeView;
}

/**
 * Hierarchical DRE table with one column per period.
 * Server component — no interactivity (sorting/drill-down comes later).
 */
export function DRETable({ view }: DRETableProps) {
  const periodLabels = view.periods.map((p) => Period.fromString(p).label());

  return (
    <Card>
      <CardHeader>
        <CardTitle>DRE Gerencial</CardTitle>
        <CardDescription>
          {view.periods.length} {view.periods.length === 1 ? 'período' : 'períodos'} ·
          comparativo mensal
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="border-b border-t bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-muted/30 px-4 py-2 text-left font-medium">
                  Linha
                </th>
                {periodLabels.map((label) => (
                  <th key={label} className="px-4 py-2 text-right font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b last:border-b-0',
                    row.isSubtotal && 'bg-muted/20 font-semibold',
                  )}
                >
                  <td
                    className={cn(
                      'sticky left-0 z-10 max-w-[16rem] truncate px-4 py-2',
                      row.isSubtotal ? 'bg-muted/20' : 'bg-background',
                    )}
                    title={row.label}
                  >
                    {row.label}
                  </td>
                  {row.cells.map((c) => (
                    <td
                      key={c.period}
                      className={cn(
                        'px-4 py-2 text-right',
                        c.value.isNegative() && 'text-destructive',
                      )}
                    >
                      <div>{c.value.format('pt-BR')}</div>
                      {c.deltaPct !== null && (
                        <div
                          className={cn(
                            'text-[10px]',
                            c.deltaPct >= 0 ? 'text-norma-success' : 'text-destructive',
                          )}
                        >
                          {c.deltaPct >= 0 ? '+' : ''}
                          {(c.deltaPct * 100).toFixed(1)}%
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
