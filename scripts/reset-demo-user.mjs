/**
 * Remove todos os dados do usuário demo e recria via GoTrue Admin API.
 * Resolve o problema de inserção direta via SQL que bypassa o GoTrue.
 *
 * Uso: node scripts/reset-demo-user.mjs
 */

const SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF    = process.env.SUPABASE_PROJECT_REF;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_TOKEN) { console.error('❌ SUPABASE_ACCESS_TOKEN não definida'); process.exit(1); }
if (!PROJECT_REF)    { console.error('❌ SUPABASE_PROJECT_REF não definida');   process.exit(1); }
if (!SERVICE_KEY)    { console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida'); process.exit(1); }

const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const MGMT_API       = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function sql(query) {
  const res = await fetch(MGMT_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`SQL error: ${body.message}`);
  return body;
}

async function adminApi(method, path, payload) {
  const res = await fetch(`${PROJECT_URL}/auth/v1/admin${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return res.json();
}

async function run() {
  console.log('🧹 Limpando dados do usuário demo antigo...');

  // 1. Limpar em ordem reversa de FK
  const cleanupSQL = `
    DELETE FROM public.financial_entries     WHERE company_id  = 'c0000000-0000-0000-0000-000000000001';
    DELETE FROM public.dre_account_mappings  WHERE company_id  = 'c0000000-0000-0000-0000-000000000001';
    DELETE FROM public.dre_groups            WHERE company_id  = 'c0000000-0000-0000-0000-000000000001';
    DELETE FROM public.chart_of_accounts     WHERE company_id  = 'c0000000-0000-0000-0000-000000000001';
    DELETE FROM public.companies             WHERE id          = 'c0000000-0000-0000-0000-000000000001';
    DELETE FROM public.organization_members  WHERE organization_id = 'b0000000-0000-0000-0000-000000000001';
    DELETE FROM public.organizations         WHERE id          = 'b0000000-0000-0000-0000-000000000001';
    UPDATE public.profiles SET default_organization_id = NULL WHERE id = 'a0000000-0000-0000-0000-000000000001';
    DELETE FROM public.profiles              WHERE id          = 'a0000000-0000-0000-0000-000000000001';
    DELETE FROM auth.users                   WHERE id          = 'a0000000-0000-0000-0000-000000000001';
  `;

  try {
    await sql(cleanupSQL);
    console.log('   ✅ Dados antigos removidos.');
  } catch (e) {
    // Pode falhar se alguns não existem — continuar
    console.log(`   ⚠️  Aviso na limpeza: ${e.message.slice(0, 100)}`);
  }

  // 2. Criar usuário via GoTrue Admin API (hash correto)
  console.log('\n👤 Criando usuário demo via GoTrue Admin API...');
  const createResult = await adminApi('POST', '/users', {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'demo@normacontabil.com',
    password: 'Demo@12345',
    email_confirm: true,
    user_metadata: { full_name: 'Demo Norma' },
  });

  if (createResult.error || createResult.msg) {
    throw new Error(`GoTrue create failed: ${createResult.error || createResult.msg}`);
  }
  console.log(`   ✅ Usuário criado: ${createResult.email} (id: ${createResult.id})`);

  // 3. Recriar profile + org + company + seed financeiro
  console.log('\n🌱 Recriando dados do seed...');

  const seedSQL = `
    -- Profile
    INSERT INTO public.profiles (id, full_name, default_organization_id)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'Demo Norma', NULL)
    ON CONFLICT (id) DO UPDATE SET full_name = 'Demo Norma';

    -- Org
    INSERT INTO public.organizations (id, name, slug, owner_user_id)
    VALUES ('b0000000-0000-0000-0000-000000000001','Agência Nova Era','agencia-nova-era','a0000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO NOTHING;

    -- Membership
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','owner')
    ON CONFLICT DO NOTHING;

    -- Default org no profile
    UPDATE public.profiles
    SET default_organization_id = 'b0000000-0000-0000-0000-000000000001'
    WHERE id = 'a0000000-0000-0000-0000-000000000001';

    -- Company
    INSERT INTO public.companies (id, organization_id, legal_name, trade_name, tax_id, tax_regime, base_currency)
    VALUES ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
            'Nova Era Comunicacao e Marketing Ltda','Agencia Nova Era','12345678000195','lucro_presumido','BRL')
    ON CONFLICT (id) DO NOTHING;
  `;

  await sql(seedSQL);
  console.log('   ✅ Profile, org, empresa criados.');

  // 4. Ler e executar o seed completo (contas, grupos, lançamentos)
  const { readFileSync } = await import('fs');
  const { dirname, join } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));

  const fullSeed = readFileSync(join(__dirname, '..', 'supabase', 'seed', 'seed.sql'), 'utf8');

  // Apenas a parte de contas, grupos e lançamentos (pular user/org/company)
  const partsAfterCompany = fullSeed
    .split('-- ---------------------------------------------------------------------------\n-- Chart of Accounts')[1];

  if (partsAfterCompany) {
    await sql('-- Chart of Accounts\n' + partsAfterCompany);
    console.log('   ✅ Plano de contas, grupos DRE e lançamentos criados.');
  }

  console.log('\n🎉 Usuário demo recriado com sucesso!');
  console.log('   Email: demo@normacontabil.com');
  console.log('   Senha: Demo@12345');
  console.log('   URL:   https://norma-intelligence.vercel.app/login');
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
