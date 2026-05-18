'use client';

import { useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for Sentry / Axiom — wire when observability is configured.
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-sm text-muted-foreground">Erro</p>
        <h1 className="text-3xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="text-muted-foreground">
          {error.message || 'Não conseguimos completar a sua solicitação.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Tentar novamente</Button>
        </div>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
