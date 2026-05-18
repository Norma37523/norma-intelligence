import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { LoginForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar na sua conta</h1>
        <p className="text-sm text-muted-foreground">
          Acesse o painel da Norma Intelligence com seu e-mail corporativo.
        </p>
      </header>

      <Suspense fallback={<div className="h-72 animate-pulse rounded-lg bg-muted/40" />}>
        <LoginForm />
      </Suspense>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
