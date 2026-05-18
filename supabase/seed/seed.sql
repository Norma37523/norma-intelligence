-- =============================================================================
-- Norma Intelligence — Seed de desenvolvimento
--
-- Cria um usuário demo, organização, empresa (agência digital), plano de
-- contas completo, grupos de DRE e 12 meses de lançamentos fictícios.
--
-- Aplicar com: supabase db reset
-- Usuário demo: demo@normacontabil.com / Demo@12345
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Demo user (Supabase Auth)
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at, raw_user_meta_data,
  created_at, updated_at, aud, role
) values (
  'a0000000-0000-0000-0000-000000000001',
  'demo@normacontabil.com',
  crypt('Demo@12345', gen_salt('bf')),
  now(), '{"full_name":"Demo Norma"}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
) on conflict (id) do nothing;

insert into public.profiles (id, full_name, default_organization_id)
values ('a0000000-0000-0000-0000-000000000001', 'Demo Norma', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Organization
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug, owner_user_id)
values (
  'b0000000-0000-0000-0000-000000000001',
  'Agência Nova Era',
  'agencia-nova-era',
  'a0000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role)
values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'owner'
) on conflict do nothing;

update public.profiles
set default_organization_id = 'b0000000-0000-0000-0000-000000000001'
where id = 'a0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- Company
-- ---------------------------------------------------------------------------
insert into public.companies (
  id, organization_id, legal_name, trade_name, tax_id, tax_regime, base_currency
) values (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Nova Era Comunicação e Marketing Ltda',
  'Agência Nova Era',
  '12345678000195',
  'lucro_presumido',
  'BRL'
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Chart of Accounts
-- ---------------------------------------------------------------------------
insert into public.chart_of_accounts
  (id, company_id, code, name, account_type, nature, is_analytical, sort_order)
values
  -- Caixa / Ativo
  ('accCaixa','c0000000-0000-0000-0000-000000000001','1.1.1','Caixa e Banco - Conta Corrente','asset','debit',true,1),
  -- Receitas
  ('acc1000','c0000000-0000-0000-0000-000000000001','3.1',  'Receitas de Serviços',              'revenue','credit',false,10),
  ('acc1001','c0000000-0000-0000-0000-000000000001','3.1.1','Serviços de Publicidade',           'revenue','credit',true, 11),
  ('acc1002','c0000000-0000-0000-0000-000000000001','3.1.2','Criação e Design',                 'revenue','credit',true, 12),
  ('acc1003','c0000000-0000-0000-0000-000000000001','3.1.3','Gestão de Mídias Sociais',         'revenue','credit',true, 13),
  ('acc1004','c0000000-0000-0000-0000-000000000001','3.1.4','Desenvolvimento Web',              'revenue','credit',true, 14),
  ('acc1006','c0000000-0000-0000-0000-000000000001','3.9.1','Impostos s/ Serviços (ISS/PIS/COFINS)','revenue','credit',true,20),
  -- Custos diretos
  ('acc2001','c0000000-0000-0000-0000-000000000001','4.1.1','Freelancers e Terceiros',          'expense','debit',true, 31),
  ('acc2002','c0000000-0000-0000-0000-000000000001','4.1.2','Ferramentas de Produção',          'expense','debit',true, 32),
  ('acc2003','c0000000-0000-0000-0000-000000000001','4.1.3','Licenças de Mídia e Imagem',       'expense','debit',true, 33),
  -- OPEX
  ('acc3001','c0000000-0000-0000-0000-000000000001','4.2.1','Folha de Pagamento',               'expense','debit',true, 41),
  ('acc3002','c0000000-0000-0000-0000-000000000001','4.2.2','Encargos Sociais (INSS/FGTS)',     'expense','debit',true, 42),
  ('acc3003','c0000000-0000-0000-0000-000000000001','4.2.3','Aluguel e Condomínio',             'expense','debit',true, 43),
  ('acc3004','c0000000-0000-0000-0000-000000000001','4.2.4','Softwares e SaaS',                 'expense','debit',true, 44),
  ('acc3005','c0000000-0000-0000-0000-000000000001','4.2.5','Marketing e Novos Negócios',       'expense','debit',true, 45),
  ('acc3006','c0000000-0000-0000-0000-000000000001','4.2.6','Despesas Administrativas',         'expense','debit',true, 46),
  -- Resultado financeiro
  ('acc4001','c0000000-0000-0000-0000-000000000001','5.1.1','Juros e Tarifas Bancárias',        'expense','debit',true, 60),
  ('acc4002','c0000000-0000-0000-0000-000000000001','5.1.2','Rendimentos Financeiros',          'revenue','credit',true,61)
on conflict (company_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- DRE Groups
-- ---------------------------------------------------------------------------
insert into public.dre_groups
  (id, company_id, code, label, line_type, sign, sort_order, is_subtotal)
values
  ('dg_rev_bruta','c0000000-0000-0000-0000-000000000001','RB',  'Receita Bruta de Serviços','revenue_gross',     1, 10,false),
  ('dg_ded',      'c0000000-0000-0000-0000-000000000001','DED', 'Deduções / Impostos',      'deduction',        -1, 20,false),
  ('dg_cpv',      'c0000000-0000-0000-0000-000000000001','CPV', 'Custos Diretos (CPV)',     'cost',             -1, 40,false),
  ('dg_opex',     'c0000000-0000-0000-0000-000000000001','OPEX','Despesas Operacionais',    'operating_expense',-1, 60,false),
  ('dg_fin',      'c0000000-0000-0000-0000-000000000001','FIN', 'Resultado Financeiro',     'financial_result', -1, 80,false)
on conflict (company_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- DRE Mappings
-- ---------------------------------------------------------------------------
insert into public.dre_account_mappings (company_id, account_id, dre_group_id, weight) values
  ('c0000000-0000-0000-0000-000000000001','acc1001','dg_rev_bruta',1.0),
  ('c0000000-0000-0000-0000-000000000001','acc1002','dg_rev_bruta',1.0),
  ('c0000000-0000-0000-0000-000000000001','acc1003','dg_rev_bruta',1.0),
  ('c0000000-0000-0000-0000-000000000001','acc1004','dg_rev_bruta',1.0),
  ('c0000000-0000-0000-0000-000000000001','acc1006','dg_ded',      1.0),
  ('c0000000-0000-0000-0000-000000000001','acc2001','dg_cpv',      1.0),
  ('c0000000-0000-0000-0000-000000000001','acc2002','dg_cpv',      1.0),
  ('c0000000-0000-0000-0000-000000000001','acc2003','dg_cpv',      1.0),
  ('c0000000-0000-0000-0000-000000000001','acc3001','dg_opex',     1.0),
  ('c0000000-0000-0000-0000-000000000001','acc3002','dg_opex',     1.0),
  ('c0000000-0000-0000-0000-000000000001','acc3003','dg_opex',     1.0),
  ('c0000000-0000-0000-0000-000000000001','acc3004','dg_opex',     1.0),
  ('c0000000-0000-0000-0000-000000000001','acc3005','dg_opex',     1.0),
  ('c0000000-0000-0000-0000-000000000001','acc3006','dg_opex',     1.0),
  ('c0000000-0000-0000-0000-000000000001','acc4001','dg_fin',      1.0),
  ('c0000000-0000-0000-0000-000000000001','acc4002','dg_fin',      1.0)
on conflict (account_id, dre_group_id) do nothing;

-- ---------------------------------------------------------------------------
-- Financial entries — 12 meses (Mai/2025 → Abr/2026)
-- Agência digital em crescimento: receita R$180k→R$310k, margem EBITDA ~28%
-- ---------------------------------------------------------------------------
do $$
declare
  comp     constant uuid := 'c0000000-0000-0000-0000-000000000001';
  periods  text[]  := array['2025-05','2025-06','2025-07','2025-08','2025-09','2025-10',
                             '2025-11','2025-12','2026-01','2026-02','2026-03','2026-04'];
  -- receita bruta por período em centavos
  revenues bigint[] := array[
    18000000::bigint, 21500000::bigint, 23000000::bigint, 25500000::bigint,
    27000000::bigint, 24000000::bigint, 28500000::bigint, 30000000::bigint,
    29000000::bigint, 31500000::bigint, 33000000::bigint, 31000000::bigint
  ];
  i      int;
  rb     bigint;   -- receita bruta
  ded    bigint;   -- deduções ~11.65%
  cpv    bigint;   -- custo direto ~22%
  folha  bigint;   -- folha ~28%
  enc    bigint;   -- encargos ~35% da folha
  alug   bigint := 500000;
  saas_v bigint := 180000;
  mktg   bigint;
  adm    bigint;
  edate  date;
begin
  for i in 1..12 loop
    rb    := revenues[i];
    ded   := (rb * 11.65 / 100)::bigint;
    cpv   := (rb * 22    / 100)::bigint;
    folha := (rb * 28    / 100)::bigint;
    enc   := (folha * 35 / 100)::bigint;
    mktg  := (rb * 4     / 100)::bigint;
    adm   := (rb * 3     / 100)::bigint + 80000;
    edate := (periods[i] || '-15')::date;

    -- ── Receitas (direction='credit' — conta de receita é creditada) ──
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values
      (comp,edate,'Rec. publicidade '   ||periods[i],'accCaixa','acc1001',(rb*45/100)::bigint,'BRL','credit','manual'),
      (comp,edate,'Rec. criação '       ||periods[i],'accCaixa','acc1002',(rb*25/100)::bigint,'BRL','credit','manual'),
      (comp,edate,'Rec. social media '  ||periods[i],'accCaixa','acc1003',(rb*20/100)::bigint,'BRL','credit','manual'),
      (comp,edate,'Rec. dev web '       ||periods[i],'accCaixa','acc1004',(rb*10/100)::bigint,'BRL','credit','manual');

    -- ── Deduções (direction='debit' — conta de deduções é debitada) ──
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values
      (comp,edate,'Impostos s/ receita '||periods[i],'acc1006','accCaixa',ded,'BRL','debit','manual');

    -- ── CPV (direction='debit') ──
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values
      (comp,edate,'Freelancers '       ||periods[i],'acc2001','accCaixa',(cpv*70/100)::bigint,'BRL','debit','manual'),
      (comp,edate,'Ferramentas prod. ' ||periods[i],'acc2002','accCaixa',(cpv*20/100)::bigint,'BRL','debit','manual'),
      (comp,edate,'Licencas midia '    ||periods[i],'acc2003','accCaixa',(cpv*10/100)::bigint,'BRL','debit','manual');

    -- ── OPEX (direction='debit') ──
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values
      (comp,edate,'Folha pagamento '   ||periods[i],'acc3001','accCaixa',folha,  'BRL','debit','manual'),
      (comp,edate,'Encargos INSS/FGTS '||periods[i],'acc3002','accCaixa',enc,    'BRL','debit','manual'),
      (comp,edate,'Aluguel '           ||periods[i],'acc3003','accCaixa',alug,   'BRL','debit','manual'),
      (comp,edate,'SaaS ferramentas '  ||periods[i],'acc3004','accCaixa',saas_v, 'BRL','debit','manual'),
      (comp,edate,'Marketing '         ||periods[i],'acc3005','accCaixa',mktg,   'BRL','debit','manual'),
      (comp,edate,'Administrativo '    ||periods[i],'acc3006','accCaixa',adm,    'BRL','debit','manual');

    -- ── Financeiro (direction='debit') ──
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values
      (comp,edate,'Juros e tarifas '||periods[i],'acc4001','accCaixa',15000,'BRL','debit','manual');

  end loop;
end $$;
