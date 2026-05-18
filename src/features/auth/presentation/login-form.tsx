'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import { signInWithPassword } from '../application/actions';
import { initialAuthState } from '../application/types';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/app';
  const [state, formAction, pending] = useActionState(signInWithPassword, initialAuthState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@empresa.com.br"
          aria-describedby={state.status === 'error' ? 'auth-error' : undefined}
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
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        {state.status === 'error' && state.fieldErrors?.password?.[0] && (
          <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      {state.status === 'error' && state.message && (
        <p id="auth-error" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Entrando…
          </>
        ) : (
          'Entrar'
        )}
      </Button>
    </form>
  );
}
