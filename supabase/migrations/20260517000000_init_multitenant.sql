-- =============================================================================
-- Norma Intelligence — Initial multi-tenant schema
-- Tables: profiles, organizations, organization_members
-- Strategy: every business table will carry organization_id and be gated by RLS
-- via the auth.uid() ↔ organization_members membership check.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.member_role as enum ('owner', 'admin', 'analyst', 'viewer');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles  — 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public profile information per authenticated user.';

-- ---------------------------------------------------------------------------
-- organizations — tenants
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  tax_id text,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_owner on public.organizations (owner_user_id);

comment on table public.organizations is 'Tenants. Every business record references organization_id.';

-- ---------------------------------------------------------------------------
-- organization_members — N:N users ↔ organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members (user_id);

comment on table public.organization_members is 'Memberships: which users belong to which organization, and in what role.';

-- ---------------------------------------------------------------------------
-- Foreign key from profiles.default_organization_id  — added last so the
-- forward reference is well-defined.
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_default_organization_id_fkey,
  add constraint profiles_default_organization_id_fkey
    foreign key (default_organization_id)
    references public.organizations(id)
    on delete set null;

-- ---------------------------------------------------------------------------
-- Touch updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at before update on public.organizations
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Membership-check helper (used by RLS policies on every business table)
-- ---------------------------------------------------------------------------
create or replace function public.is_member_of(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_role_in(target_org uuid, required_roles public.member_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = any (required_roles)
  );
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- organizations --------------------------------------------------------------
drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations for select
  using (public.is_member_of(id));

drop policy if exists "organizations_insert_owner" on public.organizations;
create policy "organizations_insert_owner"
  on public.organizations for insert
  with check (owner_user_id = auth.uid());

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
  on public.organizations for update
  using (public.has_role_in(id, array['owner','admin']::public.member_role[]))
  with check (public.has_role_in(id, array['owner','admin']::public.member_role[]));

drop policy if exists "organizations_delete_owner" on public.organizations;
create policy "organizations_delete_owner"
  on public.organizations for delete
  using (public.has_role_in(id, array['owner']::public.member_role[]));

-- organization_members -------------------------------------------------------
drop policy if exists "org_members_select_in_same_org" on public.organization_members;
create policy "org_members_select_in_same_org"
  on public.organization_members for select
  using (public.is_member_of(organization_id));

drop policy if exists "org_members_insert_owner" on public.organization_members;
create policy "org_members_insert_owner"
  on public.organization_members for insert
  with check (public.has_role_in(organization_id, array['owner','admin']::public.member_role[]));

drop policy if exists "org_members_update_owner" on public.organization_members;
create policy "org_members_update_owner"
  on public.organization_members for update
  using (public.has_role_in(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_role_in(organization_id, array['owner','admin']::public.member_role[]));

drop policy if exists "org_members_delete_owner" on public.organization_members;
create policy "org_members_delete_owner"
  on public.organization_members for delete
  using (public.has_role_in(organization_id, array['owner','admin']::public.member_role[]));

-- ---------------------------------------------------------------------------
-- After an organization is created, automatically add the creator as owner.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict do nothing;

  update public.profiles
    set default_organization_id = new.id
    where id = new.owner_user_id
      and default_organization_id is null;

  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();
