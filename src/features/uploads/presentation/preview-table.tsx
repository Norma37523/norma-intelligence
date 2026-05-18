import { AlertTriangle, CheckCircle2, FileWarning } from 'lucide-react';

import { Money } from '@/shared/money/money';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

import type { UploadPreview } from '../application/types';

interface PreviewTableProps {
  preview: UploadPreview;
}

/**
 * Server component — renders the parsed/categorized rows.
 * The "Confirm import" action lives in a sibling client component.
 */
export function PreviewTable({ preview }: PreviewTableProps) {
  const visible = preview.rows.slice(0, 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total de linhas" value={preview.stats.total.toString()} />
        <Stat
          label="Categorizadas"
          value={preview.stats.autoCategorized.toString()}
          tone="success"
        />
        <Stat
          label="A revisar"
          value={preview.stats.needsReview.toString()}
          tone={preview.stats.needsReview > 0 ? 'warning' : 'default'}
        />
        <Stat
          label="Com erros"
          value={preview.stats.withErrors.toString()}
          tone={preview.stats.withErrors > 0 ? 'destructive' : 'default'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de colunas</CardTitle>
          <CardDescription>
            Inferido com confiança {(preview.mappingScore * 100).toFixed(0)}%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {Object.entries(preview.mapping).map(([slot, header]) => (
              <div key={slot} className="flex items-center justify-between border-b py-1">
                <dt className="font-medium text-muted-foreground">{slot}</dt>
                <dd className="font-mono text-xs">{header}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização das linhas</CardTitle>
          <CardDescription>
            Mostrando até 100 linhas. Confirme abaixo para importar todas as {preview.stats.total}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Descrição</th>
                  <th className="py-2 pr-3 text-right">Valor</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const abs = row.amountMinor < 0n ? -row.amountMinor : row.amountMinor;
                  const money = Money.fromMinor(abs, 'BRL');
                  const hasError = row.issues.some((i) => i.level === 'error');
                  return (
                    <tr key={row.sourceLineNumber} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {row.sourceLineNumber}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.entryDate ?? '—'}
                      </td>
                      <td className="max-w-xs truncate py-2 pr-3" title={row.description}>
                        {row.description || (
                          <span className="text-muted-foreground">(sem descrição)</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'py-2 pr-3 text-right font-mono',
                          row.direction === 'debit' ? 'text-destructive' : 'text-norma-success',
                        )}
                      >
                        {row.direction === 'debit' ? '-' : '+'}
                        {money.format('pt-BR')}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {row.categorization.source}
                        </span>
                      </td>
                      <td className="py-2">
                        {hasError ? (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <FileWarning className="size-3.5" /> Erro
                          </span>
                        ) : row.categorization.needsReview ? (
                          <span className="inline-flex items-center gap-1 text-norma-warning">
                            <AlertTriangle className="size-3.5" /> Revisar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-norma-success">
                            <CheckCircle2 className="size-3.5" /> Pronto
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4',
        tone === 'success' && 'border-norma-success/40',
        tone === 'warning' && 'border-norma-warning/40',
        tone === 'destructive' && 'border-destructive/40',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          tone === 'success' && 'text-norma-success',
          tone === 'warning' && 'text-norma-warning',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  );
}
