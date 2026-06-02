-- =============================================================================
-- Norma Intelligence — Seed de desenvolvimento
--
-- Cria um usuário demo, organização, empresa (agência digital), plano de
-- contas completo, grupos de DRE e 12 meses de lançamentos fictícios.
--
-- Aplicar com: supabase db reset (local) ou scripts/run-seed.mjs (cloud)
-- Usuário demo: demo@normacontabil.com / Demo@12345
-- =============================================================================

-- ---------------------------------------------------------------------------
-- UUIDs fixos para referência cruzada
-- ---------------------------------------------------------------------------
-- USER   : a0000000-0000-0000-0000-000000000001
-- ORG    : b0000000-0000-0000-0000-000000000001
-- COMPANY: c0000000-0000-0000-0000-000000000001
-- ACCOUNTS (chart_of_accounts):
--   Caixa  : d0000000-0000-0000-0000-000000000000
--   3.1    : d0000000-0000-0000-0000-000000001000  (grupo — não analítica)
--   3.1.1  : d0000000-0000-0000-0000-000000001001
--   3.1.2  : d0000000-0000-0000-0000-000000001002
--   3.1.3  : d0000000-0000-0000-0000-000000001003
--   3.1.4  : d0000000-0000-0000-0000-000000001004
--   3.9.1  : d0000000-0000-0000-0000-000000001006
--   4.1.1  : d0000000-0000-0000-0000-000000002001
--   4.1.2  : d0000000-0000-0000-0000-000000002002
--   4.1.3  : d0000000-0000-0000-0000-000000002003
--   4.2.1  : d0000000-0000-0000-0000-000000003001
--   4.2.2  : d0000000-0000-0000-0000-000000003002
--   4.2.3  : d0000000-0000-0000-0000-000000003003
--   4.2.4  : d0000000-0000-0000-0000-000000003004
--   4.2.5  : d0000000-0000-0000-0000-000000003005
--   4.2.6  : d0000000-0000-0000-0000-000000003006
--   5.1.1  : d0000000-0000-0000-0000-000000004001
--   5.1.2  : d0000000-0000-0000-0000-000000004002
-- DRE GROUPS:
--   RB     : e0000000-0000-0000-0000-000000000001
--   DED    : e0000000-0000-0000-0000-000000000002
--   CPV    : e0000000-0000-0000-0000-000000000003
--   OPEX   : e0000000-0000-0000-0000-000000000004
--   FIN    : e0000000-0000-0000-0000-000000000005

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
  'Nova Era Comunicacao e Marketing Ltda',
  'Agencia Nova Era',
  '12345678000195',
  'lucro_presumido',
  'BRL'
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Chart of Accounts (all IDs are valid UUIDs)
-- ---------------------------------------------------------------------------
insert into public.chart_of_accounts
  (id, company_id, code, name, account_type, nature, is_analytical, sort_order)
values
  ('d0000000-0000-0000-0000-000000000000','c0000000-0000-0000-0000-000000000001','1.1.1','Caixa e Banco - Conta Corrente','asset','debit',true,1),
  ('d0000000-0000-0000-0000-000000001000','c0000000-0000-0000-0000-000000000001','3.1',  'Receitas de Servicos',         'revenue','credit',false,10),
  ('d0000000-0000-0000-0000-000000001001','c0000000-0000-0000-0000-000000000001','3.1.1','Servicos de Publicidade',      'revenue','credit',true, 11),
  ('d0000000-0000-0000-0000-000000001002','c0000000-0000-0000-0000-000000000001','3.1.2','Criacao e Design',             'revenue','credit',true, 12),
  ('d0000000-0000-0000-0000-000000001003','c0000000-0000-0000-0000-000000000001','3.1.3','Gestao de Midias Sociais',     'revenue','credit',true, 13),
  ('d0000000-0000-0000-0000-000000001004','c0000000-0000-0000-0000-000000000001','3.1.4','Desenvolvimento Web',          'revenue','credit',true, 14),
  ('d0000000-0000-0000-0000-000000001006','c0000000-0000-0000-0000-000000000001','3.9.1','Impostos s/ Servicos',         'revenue','credit',true, 20),
  ('d0000000-0000-0000-0000-000000002001','c0000000-0000-0000-0000-000000000001','4.1.1','Freelancers e Terceiros',      'expense','debit',true, 31),
  ('d0000000-0000-0000-0000-000000002002','c0000000-0000-0000-0000-000000000001','4.1.2','Ferramentas de Producao',      'expense','debit',true, 32),
  ('d0000000-0000-0000-0000-000000002003','c0000000-0000-0000-0000-000000000001','4.1.3','Licencas de Midia e Imagem',   'expense','debit',true, 33),
  ('d0000000-0000-0000-0000-000000003001','c0000000-0000-0000-0000-000000000001','4.2.1','Folha de Pagamento',           'expense','debit',true, 41),
  ('d0000000-0000-0000-0000-000000003002','c0000000-0000-0000-0000-000000000001','4.2.2','Encargos Sociais INSS/FGTS',   'expense','debit',true, 42),
  ('d0000000-0000-0000-0000-000000003003','c0000000-0000-0000-0000-000000000001','4.2.3','Aluguel e Condominio',         'expense','debit',true, 43),
  ('d0000000-0000-0000-0000-000000003004','c0000000-0000-0000-0000-000000000001','4.2.4','Softwares e SaaS',             'expense','debit',true, 44),
  ('d0000000-0000-0000-0000-000000003005','c0000000-0000-0000-0000-000000000001','4.2.5','Marketing e Novos Negocios',   'expense','debit',true, 45),
  ('d0000000-0000-0000-0000-000000003006','c0000000-0000-0000-0000-000000000001','4.2.6','Despesas Administrativas',     'expense','debit',true, 46),
  ('d0000000-0000-0000-0000-000000004001','c0000000-0000-0000-0000-000000000001','5.1.1','Juros e Tarifas Bancarias',    'expense','debit',true, 60),
  ('d0000000-0000-0000-0000-000000004002','c0000000-0000-0000-0000-000000000001','5.1.2','Rendimentos Financeiros',      'revenue','credit',true,61)
on conflict (company_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- DRE Groups
-- ---------------------------------------------------------------------------
insert into public.dre_groups
  (id, company_id, code, label, line_type, sign, sort_order, is_subtotal)
values
  ('e0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','RB',  'Receita Bruta de Servicos','revenue_gross',     1, 10,false),
  ('e0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','DED', 'Deducoes / Impostos',      'deduction',        -1, 20,false),
  ('e0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000001','CPV', 'Custos Diretos (CPV)',     'cost',             -1, 40,false),
  ('e0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000001','OPEX','Despesas Operacionais',    'operating_expense',-1, 60,false),
  ('e0000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000001','FIN', 'Resultado Financeiro',     'financial_result', -1, 80,false)
on conflict (company_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- DRE Account Mappings
-- ---------------------------------------------------------------------------
insert into public.dre_account_mappings (company_id, account_id, dre_group_id, weight) values
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000001001','e0000000-0000-0000-0000-000000000001',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000001002','e0000000-0000-0000-0000-000000000001',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000001003','e0000000-0000-0000-0000-000000000001',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000001004','e0000000-0000-0000-0000-000000000001',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000001006','e0000000-0000-0000-0000-000000000002',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000002001','e0000000-0000-0000-0000-000000000003',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000002002','e0000000-0000-0000-0000-000000000003',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000002003','e0000000-0000-0000-0000-000000000003',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000003001','e0000000-0000-0000-0000-000000000004',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000003002','e0000000-0000-0000-0000-000000000004',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000003003','e0000000-0000-0000-0000-000000000004',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000003004','e0000000-0000-0000-0000-000000000004',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000003005','e0000000-0000-0000-0000-000000000004',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000003006','e0000000-0000-0000-0000-000000000004',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000004001','e0000000-0000-0000-0000-000000000005',1.0),
  ('c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000004002','e0000000-0000-0000-0000-000000000005',1.0)
on conflict (account_id, dre_group_id) do nothing;

-- ---------------------------------------------------------------------------
-- Financial entries — 12 meses (Mai/2025 a Abr/2026)
-- Agencia digital em crescimento: receita R$180k a R$310k, margem EBITDA ~28%
-- ---------------------------------------------------------------------------
do $$
declare
  comp     constant uuid := 'c0000000-0000-0000-0000-000000000001';
  acc_cx   constant uuid := 'd0000000-0000-0000-0000-000000000000';
  acc_pub  constant uuid := 'd0000000-0000-0000-0000-000000001001';
  acc_cri  constant uuid := 'd0000000-0000-0000-0000-000000001002';
  acc_soc  constant uuid := 'd0000000-0000-0000-0000-000000001003';
  acc_web  constant uuid := 'd0000000-0000-0000-0000-000000001004';
  acc_imp  constant uuid := 'd0000000-0000-0000-0000-000000001006';
  acc_fre  constant uuid := 'd0000000-0000-0000-0000-000000002001';
  acc_fer  constant uuid := 'd0000000-0000-0000-0000-000000002002';
  acc_lic  constant uuid := 'd0000000-0000-0000-0000-000000002003';
  acc_fol  constant uuid := 'd0000000-0000-0000-0000-000000003001';
  acc_enc  constant uuid := 'd0000000-0000-0000-0000-000000003002';
  acc_alg  constant uuid := 'd0000000-0000-0000-0000-000000003003';
  acc_sas  constant uuid := 'd0000000-0000-0000-0000-000000003004';
  acc_mkt  constant uuid := 'd0000000-0000-0000-0000-000000003005';
  acc_adm  constant uuid := 'd0000000-0000-0000-0000-000000003006';
  acc_jur  constant uuid := 'd0000000-0000-0000-0000-000000004001';
  periods  text[]  := array['2025-05','2025-06','2025-07','2025-08','2025-09','2025-10',
                             '2025-11','2025-12','2026-01','2026-02','2026-03','2026-04'];
  revenues bigint[] := array[
    18000000::bigint, 21500000::bigint, 23000000::bigint, 25500000::bigint,
    27000000::bigint, 24000000::bigint, 28500000::bigint, 30000000::bigint,
    29000000::bigint, 31500000::bigint, 33000000::bigint, 31000000::bigint
  ];
  i      int;
  rb     bigint;
  ded    bigint;
  cpv    bigint;
  folha  bigint;
  enc    bigint;
  alug   constant bigint := 500000;
  saas_v constant bigint := 180000;
  mktg   bigint;
  adm    bigint;
  edate  date;
begin
  for i in 1..12 loop
    rb    := revenues[i];
    ded   := (rb * 1165 / 10000)::bigint;
    cpv   := (rb * 22 / 100)::bigint;
    folha := (rb * 28 / 100)::bigint;
    enc   := (folha * 35 / 100)::bigint;
    mktg  := (rb * 4 / 100)::bigint;
    adm   := (rb * 3 / 100)::bigint + 80000;
    edate := (periods[i] || '-15')::date;

    -- Receitas
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values
      (comp,edate,'Rec. publicidade '  ||periods[i],acc_cx,acc_pub,(rb*45/100)::bigint,'BRL','credit','manual'),
      (comp,edate,'Rec. criacao '      ||periods[i],acc_cx,acc_cri,(rb*25/100)::bigint,'BRL','credit','manual'),
      (comp,edate,'Rec. social media ' ||periods[i],acc_cx,acc_soc,(rb*20/100)::bigint,'BRL','credit','manual'),
      (comp,edate,'Rec. dev web '      ||periods[i],acc_cx,acc_web,(rb*10/100)::bigint,'BRL','credit','manual');

    -- Deducoes
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values (comp,edate,'Impostos s/ receita '||periods[i],acc_imp,acc_cx,ded,'BRL','debit','manual');

    -- CPV
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values
      (comp,edate,'Freelancers '      ||periods[i],acc_fre,acc_cx,(cpv*70/100)::bigint,'BRL','debit','manual'),
      (comp,edate,'Ferramentas prod. '||periods[i],acc_fer,acc_cx,(cpv*20/100)::bigint,'BRL','debit','manual'),
      (comp,edate,'Licencas midia '   ||periods[i],acc_lic,acc_cx,(cpv*10/100)::bigint,'BRL','debit','manual');

    -- OPEX
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values
      (comp,edate,'Folha pagamento '    ||periods[i],acc_fol,acc_cx,folha,  'BRL','debit','manual'),
      (comp,edate,'Encargos INSS/FGTS ' ||periods[i],acc_enc,acc_cx,enc,    'BRL','debit','manual'),
      (comp,edate,'Aluguel '            ||periods[i],acc_alg,acc_cx,alug,   'BRL','debit','manual'),
      (comp,edate,'SaaS ferramentas '   ||periods[i],acc_sas,acc_cx,saas_v, 'BRL','debit','manual'),
      (comp,edate,'Marketing '          ||periods[i],acc_mkt,acc_cx,mktg,   'BRL','debit','manual'),
      (comp,edate,'Administrativo '     ||periods[i],acc_adm,acc_cx,adm,    'BRL','debit','manual');

    -- Financeiro
    insert into public.financial_entries
      (company_id,entry_date,description,debit_account_id,credit_account_id,amount_minor,currency,direction,source)
    values (comp,edate,'Juros e tarifas '||periods[i],acc_jur,acc_cx,15000,'BRL','debit','manual');

  end loop;
end $$;
