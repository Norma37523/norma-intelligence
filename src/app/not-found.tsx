import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="text-muted-foreground">
          O recurso que você procura não existe ou foi movido.
        </p>
        <Button asChild>
          <Link href="/">Voltar para o início</Link>
        </Button>
      </div>
    </div>
  );
}
