-- =============================================================================
-- Norma Intelligence — Financial data
--
-- Uploads (extratos, planilhas, conciliações) and financial_entries (lançamentos).
-- Money is stored as integer minor units (centavos) in `amount_minor bigint` —
-- matches the Money value object in TypeScript and avoids float drift.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.upload_kind as enum (
    'bank_statement_ofx','bank_statement_csv','bank_statement_pdf',
    'chart_of_accounts','journal_entries','invoices_in','invoices_out','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.upload_status as enum ('pending','processing','processed','failed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.entry_direction as enum ('debit','credit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.entry_source as enum ('manual','ofx','csv','pdf','api','erp_dominio','reconciliation','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reconciliation_status as enum ('unreconciled','partial','reconciled','disputed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- uploads — arquivos enviados por usuários ou integrações
-- ---------------------------------------------------------------------------
create table if not exists public.uploads (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  kind public.upload_kind not null,
  status public.upload_status not null default 'pending',
  file_name text not null,
  storage_bucket text not null default 'uploads',
  storage_path text not null,             -- key dentro do bucket Supabase Storage
  file_size_bytes bigint check (file_size_bytes >= 0),
  mime_type text,
  checksum_sha256 text,                   -- usado para deduplicação opcional
  source_period_start date,               -- período coberto, se aplicável
  source_period_end date,
  processed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  stats jsonb not null default '{}'::jsonb,  -- {rows_total, rows_imported, rows_skipped, ...}
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_uploads_company_created
  on public.uploads (company_id, created_at desc);
create index if not exists idx_uploads_status
  on public.uploads (company_id, status) where status in ('pending','processing','failed');
create index if not exists idx_uploads_checksum
  on public.uploads (company_id, checksum_sha256) where checksum_sha256 is not null;

drop trigger if exists set_updated_at on public.uploads;
create trigger set_updated_at before update on public.uploads
  for each row execute function public.tg_set_updated_at();

comment on table public.uploads is
  'Files (OFX/CSV/PDF/etc.) ingested into a company. Drives import pipelines and bank reconciliation.';

-- ---------------------------------------------------------------------------
-- financial_entries — lançamentos contábeis / financeiros
--
-- We use the "double-entry single row" pattern: each entry references exactly
-- one debit account and one credit account, plus a positive amount in minor
-- units. For more complex multi-leg postings, expand later via a `legs` table.
-- ---------------------------------------------------------------------------
create table if not exists public.financial_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  fiscal_period_id uuid references public.fiscal_periods(id) on delete set null,

  -- when / what
  entry_date date not null,                 -- competência (accrual date)
  due_date date,                            -- vencimento
  cash_date date,                           -- data efetiva da liquidação (caixa)
  description text not null,
  document_number text,
  document_type text,                       -- 'nf','recibo','boleto','contrato', etc.

  -- money
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'BRL',
  direction public.entry_direction not null,

  -- accounting
  debit_account_id uuid references public.chart_of_accounts(id) on delete restrict,
  credit_account_id uuid references public.chart_of_accounts(id) on delete restrict,
  cost_center_id uuid references public.cost_centers(id) on delete set null,

  -- counterparty
  counterparty_name text,
  counterparty_tax_id text,

  -- provenance
  source public.entry_source not null default 'manual',
  source_reference text,                    -- id externo / linha do arquivo / id no Domínio
  upload_id uuid references public.uploads(id) on delete set null,

  -- reconciliation
  reconciliation_status public.reconciliation_status not null default 'unreconciled',
  reconciled_at timestamptz,
  reconciled_by_user_id uuid references auth.users(id) on delete set null,
  matched_entry_id uuid references public.financial_entries(id) on delete set null,

  -- misc
  tags text[] not null default array[]::text[],
  notes text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,

  -- A given import line should not duplicate.
  unique (company_id, source, source_reference)
);

-- A non-manual entry coming from a file must reference the upload it came from.
alter table public.financial_entries
  drop constraint if exists chk_financial_entries_upload_consistency;
alter table public.financial_entries
  add constraint chk_financial_entries_upload_consistency
  check (
    source = 'manual'
    or source = 'api'
    or source = 'reconciliation'
    or upload_id is not null
  );

create index if not exists idx_entries_company_date
  on public.financial_entries (company_id, entry_date desc);
create index if not exists idx_entries_period
  on public.financial_entries (fiscal_period_id);
create index if not exists idx_entries_debit_account
  on public.financial_entries (debit_account_id);
create index if not exists idx_entries_credit_account
  on public.financial_entries (credit_account_id);
create index if not exists idx_entries_cost_center
  on public.financial_entries (cost_center_id);
create index if not exists idx_entries_upload
  on public.financial_entries (upload_id);
create index if not exists idx_entries_unreconciled
  on public.financial_entries (company_id, entry_date)
  where reconciliation_status = 'unreconciled';
create index if not exists idx_entries_tags_gin
  on public.financial_entries using gin (tags);

drop trigger if exists set_updated_at on public.financial_entries;
create trigger set_updated_at before update on public.financial_entries
  for each row execute function public.tg_set_updated_at();

comment on table public.financial_entries is
  'Financial transactions. amount_minor is in centavos (BRL) or other currency minor units.';

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.uploads enable row level security;
alter table public.financial_entries enable row level security;

drop policy if exists "uploads_select" on public.uploads;
create policy "uploads_select" on public.uploads for select
  using (public.is_member_of_company(company_id));

drop policy if exists "uploads_insert" on public.uploads;
create policy "uploads_insert" on public.uploads for insert
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

drop policy if exists "uploads_update" on public.uploads;
create policy "uploads_update" on public.uploads for update
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

drop policy if exists "uploads_delete" on public.uploads;
create policy "uploads_delete" on public.uploads for delete
  using (public.has_company_role(company_id, array['owner','admin']::public.member_role[]));

drop policy if exists "entries_select" on public.financial_entries;
create policy "entries_select" on public.financial_entries for select
  using (public.is_member_of_company(company_id));

drop policy if exists "entries_insert" on public.financial_entries;
create policy "entries_insert" on public.financial_entries for insert
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

drop policy if exists "entries_update" on public.financial_entries;
create policy "entries_update" on public.financial_entries for update
  using (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]))
  with check (public.has_company_role(company_id, array['owner','admin','analyst']::public.member_role[]));

drop policy if exists "entries_delete" on public.financial_entries;
create policy "entries_delete" on public.financial_entries for delete
  using (public.has_company_role(company_id, array['owner','admin']::public.member_role[]));

-- Block modification of entries inside a closed fiscal period (defense in depth).
create or replace function public.tg_block_closed_period_writes()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  st public.period_status;
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.fiscal_period_id is not null then
    select status into st from public.fiscal_periods where id = new.fiscal_period_id;
    if st in ('closed','locked') then
      raise exception 'fiscal period is %; entries cannot be modified', st
        using errcode = '23000';
    end if;
  elsif tg_op = 'DELETE' and old.fiscal_period_id is not null then
    select status into st from public.fiscal_periods where id = old.fiscal_period_id;
    if st in ('closed','locked') then
      raise exception 'fiscal period is %; entries cannot be deleted', st
        using errcode = '23000';
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists block_closed_period on public.financial_entries;
create trigger block_closed_period
  before insert or update or delete on public.financial_entries
  for each row execute function public.tg_block_closed_period_writes();
