'use server';

import { z } from 'zod';
import { createSupabaseAdminClient } from '@/shared/supabase/admin';
import { requireSession } from '@/features/auth/server';

const schema = z.object({
  organizationName: z.string().min(2, 'Nome mínimo de 2 caracteres').max(120),
  legalName: z.string().min(2).max(200),
  taxId: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos').optional().or(z.literal('')),
  taxRegime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'mei']).optional(),
});

export interface CreateOrgState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  organizationId?: string;
}

export async function createOrganizationAndCompany(
  _prev: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const session = await requireSession();

  const parsed = schema.safeParse({
    organizationName: formData.get('organizationName'),
    legalName: formData.get('legalName'),
    taxId: formData.get('taxId') ?? '',
    taxRegime: formData.get('taxRegime') ?? undefined,
  });

  if (!parsed.success) {
    const msgs = Object.values(parsed.error.flatten().fieldErrors).flat().join('; ');
    return { status: 'error', message: msgs };
  }

  const { organizationName, legalName, taxId, taxRegime } = parsed.data;
  const supabase = createSupabaseAdminClient();

  // Build a URL-safe slug from the org name.
  const slug =
    organizationName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) +
    '-' +
    Math.random().toString(36).slice(2, 6);

  // 1. Create organization.
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: organizationName, slug, owner_user_id: session.user.id })
    .select('id')
    .single();

  if (orgErr || !org) {
    return { status: 'error', message: `Erro ao criar organização: ${orgErr?.message}` };
  }

  // 2. Add user as owner member.
  await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: session.user.id,
    role: 'owner',
  });

  // 3. Set default org on profile.
  await supabase
    .from('profiles')
    .update({ default_organization_id: org.id })
    .eq('id', session.user.id);

  // 4. Create the first company under this org.
  const { error: compErr } = await supabase.from('companies').insert({
    organization_id: org.id,
    legal_name: legalName,
    tax_id: taxId || null,
    tax_regime: taxRegime ?? null,
    base_currency: 'BRL',
    fiscal_year_start_month: 1,
  });

  if (compErr) {
    return { status: 'error', message: `Organização criada, mas erro na empresa: ${compErr.message}` };
  }

  return { status: 'success', organizationId: org.id };
}
