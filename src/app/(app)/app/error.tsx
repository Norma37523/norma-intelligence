'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Erro ao carregar a página</h2>
        {/* Show message in all envs to help debug */}
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || 'Erro desconhecido no servidor.'}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground/60">digest: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="mr-2 size-4" /> Tentar novamente
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">Voltar ao login</Link>
        </Button>
      </div>
    </div>
  );
}
