'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import { signUpWithPassword } from '@/features/auth/application/actions';
import { initialAuthState } from '@/features/auth';

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, initialAuthState);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Comece agora — você poderá criar sua organização logo após o cadastro.
        </p>
      </header>

      {state.status === 'success' ? (
        <div className="rounded-lg border bg-accent/40 p-4 text-sm">
          {state.message ?? 'Conta criada. Verifique seu e-mail.'}
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" name="fullName" required placeholder="Maria Silva" />
            {state.status === 'error' && state.fieldErrors?.fullName?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.fullName[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@empresa.com.br"
            />
            {state.status === 'error' && state.fieldErrors?.email?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
            />
            {state.status === 'error' && state.fieldErrors?.password?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
            )}
          </div>

          {state.status === 'error' && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" /> Criando…
              </>
            ) : (
              'Criar conta'
            )}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
