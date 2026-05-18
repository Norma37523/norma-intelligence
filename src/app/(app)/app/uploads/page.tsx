import type { Metadata } from 'next';
import Link from 'next/link';
import { FileSpreadsheet, FileText, Upload as UploadIcon } from 'lucide-react';

import { requireSession } from '@/features/auth/server';
import { UploadDropzone } from '@/features/uploads';
import { listUploads } from '@/features/uploads/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';

export const metadata: Metadata = { title: 'Uploads' };

export default async function UploadsPage() {
  const session = await requireSession();

  // For now we pick the first organization's first company. Once the
  // organization-switcher lands, this comes from a server-side context.
  const companyId = await pickDefaultCompany(session.currentOrganizationId);

  const uploads = companyId ? await listUploads(companyId, 20) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Uploads</h1>
        <p className="mt-2 text-muted-foreground">
          Envie extratos bancários (CSV/XLSX) e razões contábeis para gerar lançamentos
          financeiros com categorização automática.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="size-4 text-primary" />
              Novo upload
            </CardTitle>
            <CardDescription>
              Arraste um arquivo CSV ou XLSX. Após o envio, você verá um preview com mapping
              automático e categorização para confirmar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyId ? (
              <UploadDropzone companyId={companyId} />
            ) : (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                Configure uma empresa antes de enviar arquivos. Vá em{' '}
                <Link className="font-medium text-primary hover:underline" href="/app/settings">
                  Configurações
                </Link>
                .
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>Últimos uploads recebidos por esta empresa.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {uploads.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                Nenhum upload ainda.
              </p>
            ) : (
              <ul className="divide-y">
                {uploads.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/app/uploads/${u.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-accent"
                    >
                      {u.file_name.toLowerCase().endsWith('.csv') ? (
                        <FileText className="size-5 text-muted-foreground" />
                      ) : (
                        <FileSpreadsheet className="size-5 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleString('pt-BR')} · {u.kind}
                        </p>
                      </div>
                      <StatusBadge status={u.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Tipos suportados: <code>.csv</code>, <code>.xlsx</code>. Datas BR (DD/MM/AAAA),
        valores BR (1.234,56) e encoding Latin-1 são reconhecidos automaticamente.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'processed'
      ? 'bg-norma-success/15 text-norma-success'
      : status === 'failed'
        ? 'bg-destructive/15 text-destructive'
        : status === 'processing'
          ? 'bg-norma-info/15 text-norma-info'
          : 'bg-muted text-muted-foreground';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>
  );
}

/**
 * Pick the user's most-recent company in their org. Placeholder until the
 * organization-switcher UI is built.
 */
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
