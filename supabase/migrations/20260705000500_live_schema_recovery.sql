-- SE7EN FIT live schema recovery migration
-- Run this if older migrations fail because the live database uses gym_id instead of id.

create extension if not exists pgcrypto;

alter table if exists public.gyms add column if not exists id uuid;
alter table if exists public.gyms add column if not exists gym_id uuid;
alter table if exists public.gyms add column if not exists owner_id uuid;
alter table if exists public.gyms add column if not exists owner_user_id uuid;
alter table if exists public.gyms add column if not exists owner_name text;
alter table if exists public.gyms add column if not exists email text;
alter table if exists public.gyms add column if not exists contact_email text;
alter table if exists public.gyms add column if not exists phone text;
alter table if exists public.gyms add column if not exists city text;
alter table if exists public.gyms add column if not exists country text;
alter table if exists public.gyms add column if not exists gym_type text;
alter table if exists public.gyms add column if not exists member_capacity integer;
alter table if exists public.gyms add column if not exists gym_capacity integer;
alter table if exists public.gyms add column if not exists referral_code text;
alter table if exists public.gyms add column if not exists partnership_status text default 'pending';
alter table if exists public.gyms add column if not exists branding jsonb not null default '{}'::jsonb;
alter table if exists public.gyms add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.gyms add column if not exists status text default 'active';
alter table if exists public.gyms add column if not exists created_at timestamptz not null default now();
alter table if exists public.gyms add column if not exists updated_at timestamptz not null default now();

update public.gyms set gym_id = id where gym_id is null and id is not null;
update public.gyms set id = gym_id where id is null and gym_id is not null;
update public.gyms set id = gen_random_uuid() where id is null;
update public.gyms set gym_id = id where gym_id is null;
update public.gyms set owner_id = owner_user_id where owner_id is null and owner_user_id is not null;
update public.gyms set owner_user_id = owner_id where owner_user_id is null and owner_id is not null;
update public.gyms set member_capacity = gym_capacity where member_capacity is null and gym_capacity is not null;
update public.gyms set gym_capacity = member_capacity where gym_capacity is null and member_capacity is not null;
update public.gyms set email = contact_email where email is null and contact_email is not null;
update public.gyms set contact_email = email where contact_email is null and email is not null;

alter table if exists public.gyms alter column id set default gen_random_uuid();
alter table if exists public.gyms alter column gym_id set default gen_random_uuid();
create unique index if not exists gyms_id_key on public.gyms(id);
create unique index if not exists gyms_gym_id_key on public.gyms(gym_id);
create index if not exists gyms_owner_id_idx on public.gyms(owner_id);
create index if not exists gyms_owner_user_id_idx on public.gyms(owner_user_id);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null,
  gym_id uuid,
  created_at timestamptz not null default now(),
  unique(user_id, role, gym_id)
);
alter table if exists public.user_roles add column if not exists gym_id uuid;
create index if not exists user_roles_user_role_gym_idx on public.user_roles(user_id, role, gym_id);

create table if not exists public.gym_members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  full_name text not null,
  email text,
  phone text,
  membership_tier text default 'Monthly',
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table if exists public.gym_members add column if not exists id uuid default gen_random_uuid();
alter table if exists public.gym_members add column if not exists gym_id uuid;
alter table if exists public.gym_members add column if not exists full_name text;
alter table if exists public.gym_members add column if not exists email text;
alter table if exists public.gym_members add column if not exists phone text;
alter table if exists public.gym_members add column if not exists membership_tier text default 'Monthly';
alter table if exists public.gym_members add column if not exists active boolean not null default true;
alter table if exists public.gym_members add column if not exists joined_at timestamptz not null default now();
create unique index if not exists gym_members_id_key on public.gym_members(id);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id uuid,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  method text default 'manual',
  created_at timestamptz not null default now()
);
alter table if exists public.attendance add column if not exists id uuid default gen_random_uuid();
alter table if exists public.attendance add column if not exists gym_id uuid;
alter table if exists public.attendance add column if not exists member_id uuid;
alter table if exists public.attendance add column if not exists checked_in_at timestamptz not null default now();
alter table if exists public.attendance add column if not exists checked_out_at timestamptz;
alter table if exists public.attendance add column if not exists method text default 'manual';
create unique index if not exists attendance_id_key on public.attendance(id);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  name text not null,
  category text,
  quantity integer not null default 1,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table if exists public.equipment add column if not exists id uuid default gen_random_uuid();
alter table if exists public.equipment add column if not exists gym_id uuid;
alter table if exists public.equipment add column if not exists name text;
alter table if exists public.equipment add column if not exists category text;
alter table if exists public.equipment add column if not exists quantity integer not null default 1;
alter table if exists public.equipment add column if not exists status text not null default 'active';
alter table if exists public.equipment add column if not exists notes text;
create unique index if not exists equipment_id_key on public.equipment(id);

create table if not exists public.gym_leads (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  full_name text not null,
  phone text,
  email text,
  source text default 'manual',
  status text not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_announcements (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  title text not null,
  body text not null,
  audience text not null default 'all_members',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id uuid,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'paid',
  method text default 'cash',
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.gym_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gym_id uuid not null,
  owner_name text,
  email text,
  phone text,
  kyc_status text not null default 'pending',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, gym_id)
);

alter table if exists public.profiles add column if not exists id uuid;
alter table if exists public.profiles add column if not exists user_id uuid;
alter table if exists public.profiles add column if not exists email text;
alter table if exists public.profiles add column if not exists role text;
alter table if exists public.profiles add column if not exists full_name text;
alter table if exists public.profiles add column if not exists phone text;
update public.profiles set user_id = id where user_id is null and id is not null;
update public.profiles set id = user_id where id is null and user_id is not null;
create unique index if not exists profiles_user_id_key on public.profiles(user_id);

create index if not exists gym_leads_gym_status_idx on public.gym_leads(gym_id, status, created_at desc);
create index if not exists gym_announcements_gym_created_idx on public.gym_announcements(gym_id, created_at desc);
create index if not exists gym_payments_gym_paid_idx on public.gym_payments(gym_id, paid_at desc);
create index if not exists gym_members_gym_idx on public.gym_members(gym_id);
create index if not exists attendance_gym_idx on public.attendance(gym_id, checked_in_at desc);
create index if not exists equipment_gym_idx on public.equipment(gym_id);

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user_id and ur.role = 'admin'
  );
$$;

create or replace function public.owns_gym(p_gym_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gyms g
    where (g.id = p_gym_id or g.gym_id = p_gym_id)
      and (g.owner_id = p_user_id or g.owner_user_id = p_user_id)
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user_id
      and ur.role = 'gym_owner'
      and ur.gym_id = p_gym_id
  );
$$;

alter table public.gym_leads enable row level security;
alter table public.gym_announcements enable row level security;
alter table public.gym_payments enable row level security;
alter table public.gym_members enable row level security;
alter table public.attendance enable row level security;
alter table public.equipment enable row level security;

drop policy if exists "Gym owners manage leads" on public.gym_leads;
create policy "Gym owners manage leads" on public.gym_leads for all to authenticated using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid())) with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Gym owners manage announcements" on public.gym_announcements;
create policy "Gym owners manage announcements" on public.gym_announcements for all to authenticated using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid())) with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Gym owners manage payments" on public.gym_payments;
create policy "Gym owners manage payments" on public.gym_payments for all to authenticated using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid())) with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Gym owners manage members" on public.gym_members;
create policy "Gym owners manage members" on public.gym_members for all to authenticated using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid())) with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Gym owners manage attendance" on public.attendance;
create policy "Gym owners manage attendance" on public.attendance for all to authenticated using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid())) with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Gym owners manage equipment" on public.equipment;
create policy "Gym owners manage equipment" on public.equipment for all to authenticated using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid())) with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));
