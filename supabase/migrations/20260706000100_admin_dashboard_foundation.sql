-- SE7EN FIT admin dashboard foundation

create extension if not exists pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'activated', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'activated';

DO $$ BEGIN
  CREATE TYPE public.gym_status AS ENUM ('pending', 'active', 'suspended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.code_status AS ENUM ('unused', 'used', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'gym_owner', 'gym_staff', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.gym_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  owner_name text,
  email text not null,
  phone text,
  kyc_status text not null default 'pending',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, gym_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'pending',
  subscription_status text not null default 'unpaid',
  provider text,
  provider_payment_id text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_manual_members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  membership_status text not null default 'active',
  joined_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid,
  member_source text not null default 'manual',
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.gyms add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.gyms add column if not exists email text;
alter table public.gyms add column if not exists phone text;
alter table public.gyms add column if not exists city text;
alter table public.gyms add column if not exists country text;
alter table public.gyms add column if not exists gym_type text;
alter table public.gyms add column if not exists member_capacity integer;
alter table public.gyms add column if not exists branding jsonb not null default '{}'::jsonb;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'super_admin');
$$;

create or replace function public.is_super_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'super_admin');
$$;

create or replace function public.owns_gym(p_user_id uuid, p_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.gym_owners where user_id = p_user_id and gym_id = p_gym_id);
$$;

create unique index if not exists user_roles_unique_scope_idx on public.user_roles (user_id, role, coalesce(gym_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists idx_gym_owners_user_id on public.gym_owners(user_id);
create index if not exists idx_gym_owners_gym_id on public.gym_owners(gym_id);
create index if not exists idx_payments_gym_status on public.payments(gym_id, status);
create index if not exists idx_manual_members_gym_id on public.gym_manual_members(gym_id);
create index if not exists idx_attendance_gym_checkin on public.gym_attendance_logs(gym_id, check_in_at desc);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.gym_owners enable row level security;
alter table public.payments enable row level security;
alter table public.gym_manual_members enable row level security;
alter table public.gym_attendance_logs enable row level security;

drop policy if exists "admin or owner read gym owners" on public.gym_owners;
create policy "admin or owner read gym owners" on public.gym_owners for select using
  (public.is_admin(auth.uid()) or user_id = auth.uid());

drop policy if exists "admin or owner read payments" on public.payments;
create policy "admin or owner read payments" on public.payments for select using
  (public.is_admin(auth.uid()) or public.owns_gym(auth.uid(), gym_id));

drop policy if exists "admin or owner read manual members" on public.gym_manual_members;
create policy "admin or owner read manual members" on public.gym_manual_members for select using
  (public.is_admin(auth.uid()) or public.owns_gym(auth.uid(), gym_id));

drop policy if exists "admin or owner read attendance logs" on public.gym_attendance_logs;
create policy "admin or owner read attendance logs" on public.gym_attendance_logs for select using
  (public.is_admin(auth.uid()) or public.owns_gym(auth.uid(), gym_id));
