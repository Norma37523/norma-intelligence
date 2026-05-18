-- =============================================================================
-- Norma Intelligence — Intelligence layer
--
-- DRE snapshots (versioned DRE statements for a closed period),
-- Forecasts (scenarios + points),
-- Insights (automatic findings — statistical or LLM-generated).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.dre_snapshot_status as enum ('draft','published','superseded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.forecast_metric as enum ('revenue','cost','ebitda','net_profit','cash');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.forecast_scenario as enum ('baseline','optimistic','pessimistic','custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.forecast_method as enum ('linear','seasonal','manual','driver_based','ml_model');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.forecast_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.insight_kind as enum (
    'variance_spike','trend_break','ratio_anomaly','forecast_deviation',
    'narrative_summary','reconciliation_alert','cash_flow_warning'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.insight_severity as enum ('info','warning','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.insight_origin as enum ('rule','statistic','llm','hybrid');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- dre_snapshots — a frozen DRE for a given period (versioned)
-- ---------------------------------------------------------------------------
create table if not exists public.dre_snapshots (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  fiscal_period_id uuid not null references public.fiscal_periods(id) on delete cascade,
  status public.dre_snapshot_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  generated_at timestamptz not null default now(),
  generated_by_user_id uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, fiscal_period_id, version)
);

create index if not exists idx_dre_snapshots_company_period
  on public.dre_snapshots (company_id, fiscal_period_id, version desc);

drop trigger if exists set_updated_at on public.dre_snapshots;
create trigger set_updated_at before update on public.dre_snapshots
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- dre_lines — line items inside a snapshot (the "DRE rows" the UI renders)
-- ---------------------------------------------------------------------------
create table if not exists public.dre_lines (
  id uuid primary key default uuid_generate_v4(),
  snapshot_id uuid not null references public.dre_snapshots(id) on delete cascade,
  dre_group_id uuid references public.dre_groups(id) on delete set null,
  parent_line_id uuid references public.dre_lines(id) on delete cascade,
  label text not null,
  line_type public.dre_line_type not null,
  amount_minor bigint not null default 0,
  prior_amount_minor bigint,                      -- mesma linha no período anterior
  delta_minor bigint generated always as
    (amount_minor - coalesce(prior_amount_minor, 0)) stored,
  currency char(3) not null default 'BRL',
  sort_order integer not null default 0,
  depth smallint not null default 0 check (depth between 0 and 6),
  is_subtotal boolean not null default false,
  details jsonb not null default '{}'::jsonb,     -- evidência / breakdown por conta
  created_at timestamptz not null default now()
);

create index if not exists idx_dre_lines_snapshot
  on public.dre_lines (snapshot_id, sort_order);
create index if not exists idx_dre_lines_parent on public.dre_lines (parent_line_id);
create index if not exists idx_dre_lines_group on public.dre_lines (dre_group_id);

comment on table public.dre_lines is
  'Materialized rows of a DRE snapshot. amount_minor is signed bigint in minor units.';

-- ---------------------------------------------------------------------------
-- forecasts — scenarios projected for a metric
-- ---------------------------------------------------------------------------
create table if not exists public.forecasts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  metric public.forecast_metric not null,
  scenario public.forecast_scenario not null,
  method public.forecast_method not null,
  status public.forecast_status not null default 'draft',
  horizon_months integer not null check (horizon_months between 1 and 120),
  base_period_start date not null,                -- período de origem dos dados históricos
  base_period_end date not null,
  parameters jsonb not null default '{}'::jsonb,  -- hyperparameters do modelo
  currency char(3) not null default 'BRL',
  generated_at timestamptz not null default now(),
  generated_by_user_id uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name, scenario)
);

create index if not exists idx_forecasts_company_metric
  on public.forecasts (company_id, metric, scenario);
create index if not exists idx_forecasts_status
  on public.forecasts (company_id, status);

drop trigger if exists set_updated_at on public.forecasts;
create trigger set_updated_at before update on public.forecasts
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- forecast_points — datapoints of a forecast (one per period)
-- ---------------------------------------------------------------------------
create table if not exists public.forecast_points (
  id uuid primary key default uuid_generate_v4(),
  forecast_id uuid not null references public.forecasts(id) on delete cascade,
  period_start date not null,                     -- sempre dia 1 do mês
  value_minor bigint not null,                    -- pode ser negativo (custo, prejuízo)
  confidence_low_minor bigint,
  confidence_high_minor bigint,
  is_override boolean not null default false,     -- ponto editado manualmente
  notes text,
  created_at timestamptz not null default now(),
  unique (forecast_id, period_start)
);

create index if not exists idx_forecast_points_forecast
  on public.forecast_points (forecast_id, period_start);

-- ---------------------------------------------------------------------------
-- insights — findings auto-generated over a company's data
-- ---------------------------------------------------------------------------
create table if not exists public.insights (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind public.insight_kind not null,
  severity public.insight_severity not null default 'info',
  origin public.insight_origin not null default 'rule',
  title text not null,
  body text not null,
  evidence jsonb not null default '{}'::jsonb,    -- account ids, periods, deltas, refs
  related_period_start date,
  related_period_end date,
  related_account_id uuid references public.chart_of_accounts(id) on delete set null,
  related_cost_center_id uuid references public.cost_centers(id) on delete set null,
  related_forecast_id uuid references public.forecasts(id) on delete set null,
  generator_model text,                            -- 'claude-opus-4-6' | 'rule:variance_v1' | ...
  generator_version text,
  score numeric(6,4) check (score is null or (score >= 0 and score <= 1)),
  dismissed_at timestamptz,
  dismissed_by_user_id uuid references auth.users(id) on delete set null,
  dismiss_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_insights_company_created
  on public.insights (company_id, created_at desc);
create index if not exists idx_insights_open
  on public.insights (company_id, severity, created_at desc)
  where dismissed_at is null;
create index if not exists idx_insights_kind
  on public.insights (company_id, kind);

drop trigger if exists set_updated_at on public.insights;
create trigger set_updated_at before update on public.insights
  for each row execute function public.tg_set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.dre_snapshots enable row level security;
alter table public.dre_lines enable row level security;
alter table public.forecasts enable row level security;
alter table public.forecast_points enable row level security;
alter table public.insights enable row level security;

-- dre_snapshots
drop policy if exists "snapshots_select" on public.dre_snapshots;
create policy "snapshots_select" on public.dre_snapshots for select
  using (public.is_member_of_company(company_id));

drop policy if exists "snapshots_modify" on public.dre_snapshots;
create policy "snapshots_modify" on public.dre_snapshots for all
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

-- dre_lines (gated via parent snapshot's company)
drop policy if exists "dre_lines_select" on public.dre_lines;
create policy "dre_lines_select" on public.dre_lines for select
  using (
    exists (
      select 1 from public.dre_snapshots s
      where s.id = snapshot_id and public.is_member_of_company(s.company_id)
    )
  );

drop policy if exists "dre_lines_modify" on public.dre_lines;
create policy "dre_lines_modify" on public.dre_lines for all
  using (
    exists (
      select 1 from public.dre_snapshots s
      where s.id = snapshot_id
        and public.has_company_role(s.company_id, array['owner','admin','analyst']::public.member_role[])
    )
  )
  with check (
    exists (
      select 1 from public.dre_snapshots s
      where s.id = snapshot_id
        and public.has_company_role(s.company_id, array['owner','admin','analyst']::public.member_role[])
    )
  );

-- forecasts
drop policy if exists "forecasts_select" on public.forecasts;
create policy "forecasts_select" on public.forecasts for select
  using (public.is_member_of_company(company_id));

drop policy if exists "forecasts_modify" on public.forecasts;
create policy "forecasts_modify" on public.forecasts for all
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

-- forecast_points
drop policy if exists "forecast_points_select" on public.forecast_points;
create policy "forecast_points_select" on public.forecast_points for select
  using (
    exists (
      select 1 from public.forecasts f
      where f.id = forecast_id and public.is_member_of_company(f.company_id)
    )
  );

drop policy if exists "forecast_points_modify" on public.forecast_points;
create policy "forecast_points_modify" on public.forecast_points for all
  using (
    exists (
      select 1 from public.forecasts f
      where f.id = forecast_id
        and public.has_company_role(f.company_id, array['owner','admin','analyst']::public.member_role[])
    )
  )
  with check (
    exists (
      select 1 from public.forecasts f
      where f.id = forecast_id
        and public.has_company_role(f.company_id, array['owner','admin','analyst']::public.member_role[])
    )
  );

-- insights
drop policy if exists "insights_select" on public.insights;
create policy "insights_select" on public.insights for select
  using (public.is_member_of_company(company_id));

drop policy if exists "insights_insert" on public.insights;
create policy "insights_insert" on public.insights for insert
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

drop policy if exists "insights_update" on public.insights;
create policy "insights_update" on public.insights for update
  using (public.is_member_of_company(company_id))    -- viewer pode "dispensar"? Não: app-layer cuida
  with check (public.has_company_role(company_id, array['owner','admin','analyst','viewer']::public.member_role[]));

drop policy if exists "insights_delete" on public.insights;
create policy "insights_delete" on public.insights for delete
  using (public.has_company_role(company_id, array['owner','admin']::public.member_role[]));
