-- SE7EN FIT admin production foundation
-- Creates backend tables required by admin and gym-owner Edge Functions.

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  alter type public.app_role add value if not exists 'gym_owner';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null references auth.users(id) on delete set null,
  action text not null,
  entity_type text null,
  entity_id text null,
  metadata jsonb not null default '{}'::jsonb,
  ip text null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);

create table if not exists public.admin_2fa_secrets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_secret text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text null,
  user_id uuid null references auth.users(id) on delete set null,
  scope text not null default 'login',
  success boolean not null default false,
  ip text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_email_created_idx on public.login_attempts (lower(email), created_at desc);
create index if not exists login_attempts_user_created_idx on public.login_attempts (user_id, created_at desc);

create table if not exists public.unique_access_codes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.gym_owner_requests(id) on delete cascade,
  code_hash text not null unique,
  code_prefix text null,
  status text not null default 'unused' check (status in ('unused', 'used', 'expired', 'revoked')),
  expires_at timestamptz not null,
  used_at timestamptz null,
  used_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists unique_access_codes_request_idx on public.unique_access_codes (request_id);
create index if not exists unique_access_codes_status_idx on public.unique_access_codes (status);
create index if not exists unique_access_codes_expires_idx on public.unique_access_codes (expires_at);

alter table public.audit_logs enable row level security;
alter table public.admin_2fa_secrets enable row level security;
alter table public.login_attempts enable row level security;
alter table public.unique_access_codes enable row level security;

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read
on public.audit_logs for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists login_attempts_admin_read on public.login_attempts;
create policy login_attempts_admin_read
on public.login_attempts for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists unique_access_codes_admin_read on public.unique_access_codes;
create policy unique_access_codes_admin_read
on public.unique_access_codes for select
to authenticated
using (public.is_admin(auth.uid()));
