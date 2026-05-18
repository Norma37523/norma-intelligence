-- =============================================================================
-- Norma Intelligence — Core business entities
--
-- Companies (legal entities), fiscal periods, cost centers, chart of accounts,
-- DRE groups and account ↔ DRE mappings.
--
-- Tenancy model:
--   organization  (1) ────< (N)  company
--   organization is the SaaS tenant; a company is one legal entity (CNPJ).
--   Most other business tables reference company_id; isolation is enforced
--   by RLS via the helper public.is_member_of_company().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.tax_regime as enum ('mei','simples_nacional','lucro_presumido','lucro_real');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_type as enum ('asset','liability','equity','revenue','expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_nature as enum ('debit','credit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cost_center_kind as enum ('cost','profit','revenue','administrative');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dre_line_type as enum (
    'revenue_gross','deduction','revenue_net','cost','gross_profit',
    'operating_expense','ebitda','depreciation','financial_result',
    'taxes','net_profit'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.period_kind as enum ('monthly','quarterly','yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.period_status as enum ('open','closed','locked');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  tax_id text,                              -- CNPJ (BR), 14 digits
  tax_regime public.tax_regime,
  fiscal_year_start_month smallint not null default 1
    check (fiscal_year_start_month between 1 and 12),
  base_currency char(3) not null default 'BRL',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, tax_id)
);

create index if not exists idx_companies_org on public.companies (organization_id);
create index if not exists idx_companies_active on public.companies (organization_id) where is_active;

drop trigger if exists set_updated_at on public.companies;
create trigger set_updated_at before update on public.companies
  for each row execute function public.tg_set_updated_at();

comment on table public.companies is
  'Legal entity (CNPJ) managed inside an organization. Most business tables reference company_id.';

-- ---------------------------------------------------------------------------
-- fiscal_periods — monthly/quarterly/yearly close windows
-- ---------------------------------------------------------------------------
create table if not exists public.fiscal_periods (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind public.period_kind not null,
  period_start date not null,
  period_end date not null,
  status public.period_status not null default 'open',
  closed_at timestamptz,
  closed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (company_id, kind, period_start)
);

create index if not exists idx_periods_company_dates
  on public.fiscal_periods (company_id, period_start desc);

drop trigger if exists set_updated_at on public.fiscal_periods;
create trigger set_updated_at before update on public.fiscal_periods
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- cost_centers — hierarchical (self-reference) per company
-- ---------------------------------------------------------------------------
create table if not exists public.cost_centers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.cost_centers(id) on delete restrict,
  code text not null,
  name text not null,
  kind public.cost_center_kind not null default 'cost',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create index if not exists idx_cost_centers_company on public.cost_centers (company_id);
create index if not exists idx_cost_centers_parent on public.cost_centers (parent_id);

drop trigger if exists set_updated_at on public.cost_centers;
create trigger set_updated_at before update on public.cost_centers
  for each row execute function public.tg_set_updated_at();

-- Prevent a cost center from being its own ancestor (cheap loop guard).
create or replace function public.tg_cost_center_no_self_cycle()
returns trigger language plpgsql as $$
declare
  cursor_id uuid := new.parent_id;
  hops int := 0;
begin
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'cost_center hierarchy would form a cycle on id %', new.id;
    end if;
    if hops > 50 then
      raise exception 'cost_center hierarchy exceeded max depth (50)';
    end if;
    select parent_id into cursor_id from public.cost_centers where id = cursor_id;
    hops := hops + 1;
  end loop;
  return new;
end $$;

drop trigger if exists cost_center_no_cycle on public.cost_centers;
create trigger cost_center_no_cycle before insert or update of parent_id on public.cost_centers
  for each row execute function public.tg_cost_center_no_self_cycle();

-- ---------------------------------------------------------------------------
-- chart_of_accounts — plano de contas, hierárquico
-- ---------------------------------------------------------------------------
create table if not exists public.chart_of_accounts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.chart_of_accounts(id) on delete restrict,
  code text not null,
  name text not null,
  account_type public.account_type not null,
  nature public.account_nature not null,
  is_analytical boolean not null default true,    -- false = synthetic/group account
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create index if not exists idx_accounts_company on public.chart_of_accounts (company_id);
create index if not exists idx_accounts_parent on public.chart_of_accounts (parent_id);
create index if not exists idx_accounts_type on public.chart_of_accounts (company_id, account_type);

drop trigger if exists set_updated_at on public.chart_of_accounts;
create trigger set_updated_at before update on public.chart_of_accounts
  for each row execute function public.tg_set_updated_at();

create or replace function public.tg_account_no_self_cycle()
returns trigger language plpgsql as $$
declare
  cursor_id uuid := new.parent_id;
  hops int := 0;
begin
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'chart_of_accounts hierarchy would form a cycle on id %', new.id;
    end if;
    if hops > 50 then
      raise exception 'chart_of_accounts hierarchy exceeded max depth (50)';
    end if;
    select parent_id into cursor_id from public.chart_of_accounts where id = cursor_id;
    hops := hops + 1;
  end loop;
  return new;
end $$;

drop trigger if exists account_no_cycle on public.chart_of_accounts;
create trigger account_no_cycle before insert or update of parent_id on public.chart_of_accounts
  for each row execute function public.tg_account_no_self_cycle();

-- ---------------------------------------------------------------------------
-- dre_groups — DRE Gerencial structure per company
-- ---------------------------------------------------------------------------
create table if not exists public.dre_groups (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.dre_groups(id) on delete restrict,
  code text not null,
  label text not null,
  line_type public.dre_line_type not null,
  sign smallint not null default 1 check (sign in (-1, 1)),
  sort_order integer not null default 0,
  is_subtotal boolean not null default false,
  formula text,                                   -- optional, for computed subtotals (parsed in app layer)
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create index if not exists idx_dre_groups_company on public.dre_groups (company_id, sort_order);

drop trigger if exists set_updated_at on public.dre_groups;
create trigger set_updated_at before update on public.dre_groups
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- dre_account_mappings — N:N between accounts and DRE groups
-- A given analytical account can map to one DRE group (typical) with a weight.
-- ---------------------------------------------------------------------------
create table if not exists public.dre_account_mappings (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id) on delete cascade,
  dre_group_id uuid not null references public.dre_groups(id) on delete cascade,
  weight numeric(6,4) not null default 1.0 check (weight >= -1 and weight <= 1),
  created_at timestamptz not null default now(),
  unique (account_id, dre_group_id)
);

create index if not exists idx_dre_map_company on public.dre_account_mappings (company_id);
create index if not exists idx_dre_map_account on public.dre_account_mappings (account_id);
create index if not exists idx_dre_map_group on public.dre_account_mappings (dre_group_id);

-- =============================================================================
-- Membership helper for company-scoped tables
-- =============================================================================
create or replace function public.is_member_of_company(target_company uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    join public.organization_members m on m.organization_id = c.organization_id
    where c.id = target_company
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_company_role(target_company uuid, required_roles public.member_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    join public.organization_members m on m.organization_id = c.organization_id
    where c.id = target_company
      and m.user_id = auth.uid()
      and m.role = any (required_roles)
  );
$$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.companies enable row level security;
alter table public.fiscal_periods enable row level security;
alter table public.cost_centers enable row level security;
alter table public.chart_of_accounts enable row level security;
alter table public.dre_groups enable row level security;
alter table public.dre_account_mappings enable row level security;

-- companies
drop policy if exists "companies_select_member" on public.companies;
create policy "companies_select_member" on public.companies for select
  using (public.is_member_of(organization_id));

drop policy if exists "companies_modify_admin" on public.companies;
create policy "companies_modify_admin" on public.companies for all
  using (public.has_role_in(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_role_in(organization_id, array['owner','admin']::public.member_role[]));

-- fiscal_periods
drop policy if exists "periods_select" on public.fiscal_periods;
create policy "periods_select" on public.fiscal_periods for select
  using (public.is_member_of_company(company_id));

drop policy if exists "periods_modify_admin" on public.fiscal_periods;
create policy "periods_modify_admin" on public.fiscal_periods for all
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

-- cost_centers
drop policy if exists "cc_select" on public.cost_centers;
create policy "cc_select" on public.cost_centers for select
  using (public.is_member_of_company(company_id));

drop policy if exists "cc_modify" on public.cost_centers;
create policy "cc_modify" on public.cost_centers for all
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

-- chart_of_accounts
drop policy if exists "coa_select" on public.chart_of_accounts;
create policy "coa_select" on public.chart_of_accounts for select
  using (public.is_member_of_company(company_id));

drop policy if exists "coa_modify" on public.chart_of_accounts;
create policy "coa_modify" on public.chart_of_accounts for all
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

-- dre_groups
drop policy if exists "dre_groups_select" on public.dre_groups;
create policy "dre_groups_select" on public.dre_groups for select
  using (public.is_member_of_company(company_id));

drop policy if exists "dre_groups_modify" on public.dre_groups;
create policy "dre_groups_modify" on public.dre_groups for all
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

-- dre_account_mappings
drop policy if exists "dre_map_select" on public.dre_account_mappings;
create policy "dre_map_select" on public.dre_account_mappings for select
  using (public.is_member_of_company(company_id));

drop policy if exists "dre_map_modify" on public.dre_account_mappings;
create policy "dre_map_modify" on public.dre_account_mappings for all
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));
