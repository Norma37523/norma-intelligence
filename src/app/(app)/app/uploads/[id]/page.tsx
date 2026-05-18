import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { requireSession } from '@/features/auth/server';
import { previewUpload, PreviewTable, CommitButton } from '@/features/uploads';
import { getUpload } from '@/features/uploads/server';

import { Button } from '@/shared/components/ui/button';

export const metadata: Metadata = { title: 'Pré-visualização do upload' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UploadDetailPage({ params }: PageProps) {
  await requireSession();
  const { id } = await params;

  const upload = await getUpload(id);
  if (!upload) notFound();

  let preview;
  let error: string | null = null;
  try {
    preview = await previewUpload(id);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Erro desconhecido.';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/app/uploads">
              <ArrowLeft /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{upload.file_name}</h1>
          <p className="text-sm text-muted-foreground">
            Recebido em {new Date(upload.created_at).toLocaleString('pt-BR')} · status{' '}
            <code>{upload.status}</code>
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : preview ? (
        <>
          <PreviewTable preview={preview} />
          <div className="sticky bottom-4 z-10">
            <div className="mx-auto max-w-md">
              <CommitButton uploadId={id} disabled={preview.stats.withErrors > 0} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
