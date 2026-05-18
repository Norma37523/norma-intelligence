import type { Metadata } from 'next';
import { Building2, KeyRound, User } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { requireSession } from '@/features/auth/server';
import { CreateOrgForm } from '@/features/organizations/presentation/create-org-form';

export const metadata: Metadata = { title: 'Configurações' };

export default async function SettingsPage() {
  const session = await requireSession();
  const hasOrg = session.memberships.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-2 text-muted-foreground">Conta, organização e preferências da plataforma.</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Conta</CardTitle>
          </div>
          <CardDescription>Dados do usuário autenticado.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row label="E-mail" value={session.user.email} />
          <Row label="Nome" value={session.user.fullName ?? '—'} />
          <Row
            label="User ID"
            value={<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{session.user.id}</code>}
          />
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Organização</CardTitle>
          </div>
          <CardDescription>
            {hasOrg
              ? 'Sua organização ativa e empresas vinculadas.'
              : 'Crie sua organização para começar a usar a plataforma.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasOrg ? (
            <div className="space-y-4">
              {session.memberships.map((m) => (
                <div key={m.organizationId} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Organização</p>
                    <code className="text-xs text-muted-foreground">{m.organizationId}</code>
                  </div>
                  <Badge variant="outline" className="capitalize">{m.role}</Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Gerenciamento multi-empresa e convite de membros disponíveis em breve.
              </p>
            </div>
          ) : (
            <CreateOrgForm />
          )}
        </CardContent>
      </Card>

      {/* API Keys hint */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Integrações &amp; IA</CardTitle>
          </div>
          <CardDescription>Conecte APIs externas para potencializar os insights.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Claude (Anthropic)</p>
              <p className="text-xs text-muted-foreground">Narrativas financeiras estilo consultor</p>
            </div>
            <Badge variant="outline">Via .env.local</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Omie API</p>
              <p className="text-xs text-muted-foreground">Sincronização automática de lançamentos</p>
            </div>
            <Badge variant="secondary">Em breve</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Conta Azul API</p>
              <p className="text-xs text-muted-foreground">Importação de extratos e notas</p>
            </div>
            <Badge variant="secondary">Em breve</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
