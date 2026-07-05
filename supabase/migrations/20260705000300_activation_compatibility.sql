-- SE7EN FIT activation compatibility layer
-- Keeps the current activate-gym-owner Edge Function working with the website schema.

alter table if exists public.gyms add column if not exists gym_id uuid;
alter table if exists public.gyms add column if not exists owner_user_id uuid;
alter table if exists public.gyms add column if not exists owner_name text;
alter table if exists public.gyms add column if not exists contact_email text;
alter table if exists public.gyms add column if not exists gym_capacity integer;
alter table if exists public.gyms add column if not exists referral_code text;
alter table if exists public.gyms add column if not exists partnership_status text default 'pending';
alter table if exists public.gyms add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.gyms set gym_id = id where gym_id is null;
update public.gyms set owner_user_id = owner_id where owner_user_id is null and owner_id is not null;
update public.gyms set owner_id = owner_user_id where owner_id is null and owner_user_id is not null;
update public.gyms set gym_capacity = member_capacity where gym_capacity is null and member_capacity is not null;
update public.gyms set member_capacity = gym_capacity where member_capacity is null and gym_capacity is not null;
update public.gyms set contact_email = email where contact_email is null and email is not null;
update public.gyms set email = contact_email where email is null and contact_email is not null;

create unique index if not exists gyms_gym_id_key on public.gyms(gym_id);
create index if not exists gyms_owner_user_id_idx on public.gyms(owner_user_id);

create or replace function public.se7enfit_sync_gym_compat()
returns trigger
language plpgsql
as $$
begin
  if new.gym_id is null then
    new.gym_id := coalesce(new.id, gen_random_uuid());
  end if;
  if new.owner_id is null and new.owner_user_id is not null then
    new.owner_id := new.owner_user_id;
  end if;
  if new.owner_user_id is null and new.owner_id is not null then
    new.owner_user_id := new.owner_id;
  end if;
  if new.member_capacity is null and new.gym_capacity is not null then
    new.member_capacity := new.gym_capacity;
  end if;
  if new.gym_capacity is null and new.member_capacity is not null then
    new.gym_capacity := new.member_capacity;
  end if;
  if new.email is null and new.contact_email is not null then
    new.email := new.contact_email;
  end if;
  if new.contact_email is null and new.email is not null then
    new.contact_email := new.email;
  end if;
  return new;
end;
$$;

drop trigger if exists se7enfit_sync_gym_compat_trigger on public.gyms;
create trigger se7enfit_sync_gym_compat_trigger
before insert or update on public.gyms
for each row execute function public.se7enfit_sync_gym_compat();

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

create index if not exists gym_owners_user_idx on public.gym_owners(user_id);
create index if not exists gym_owners_gym_idx on public.gym_owners(gym_id);

alter table if exists public.profiles add column if not exists user_id uuid;
alter table if exists public.profiles add column if not exists email text;
alter table if exists public.profiles add column if not exists role text;

update public.profiles set user_id = id where user_id is null;
create unique index if not exists profiles_user_id_key on public.profiles(user_id);

create or replace function public.se7enfit_sync_profile_compat()
returns trigger
language plpgsql
as $$
begin
  if new.id is null and new.user_id is not null then
    new.id := new.user_id;
  end if;
  if new.user_id is null and new.id is not null then
    new.user_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists se7enfit_sync_profile_compat_trigger on public.profiles;
create trigger se7enfit_sync_profile_compat_trigger
before insert or update on public.profiles
for each row execute function public.se7enfit_sync_profile_compat();
