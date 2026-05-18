'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';

import { createOrganizationAndCompany, type CreateOrgState } from '../application/create-org';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

const initial: CreateOrgState = { status: 'idle' };

export function CreateOrgForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createOrganizationAndCompany, initial);

  useEffect(() => {
    if (state.status === 'success') {
      router.refresh();
    }
  }, [state.status, router]);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="organizationName">Nome da organização</Label>
        <Input
          id="organizationName"
          name="organizationName"
          placeholder="Ex: Agência Nova Era"
          required
          minLength={2}
        />
        <p className="text-xs text-muted-foreground">
          Geralmente o nome comercial — aparece no menu lateral.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="legalName">Razão social da empresa</Label>
        <Input
          id="legalName"
          name="legalName"
          placeholder="Ex: Nova Era Comunicação Ltda"
          required
          minLength={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="taxId">CNPJ (opcional)</Label>
          <Input
            id="taxId"
            name="taxId"
            placeholder="00000000000000"
            maxLength={14}
            pattern="\d{14}"
          />
          <p className="text-xs text-muted-foreground">Somente números, 14 dígitos.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxRegime">Regime tributário</Label>
          <Select name="taxRegime">
            <SelectTrigger id="taxRegime">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
              <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
              <SelectItem value="lucro_real">Lucro Real</SelectItem>
              <SelectItem value="mei">MEI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {state.status === 'error' && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {state.status === 'success' && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">
          Organização criada com sucesso! Recarregando…
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Criando…
          </>
        ) : (
          <>
            <Building2 className="mr-2 size-4" /> Criar organização
          </>
        )}
      </Button>
    </form>
  );
}
