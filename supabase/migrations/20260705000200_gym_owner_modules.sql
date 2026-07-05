-- SE7EN FIT gym owner management module tables

create table if not exists public.gym_leads (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
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
  gym_id uuid not null references public.gyms(id) on delete cascade,
  title text not null,
  body text not null,
  audience text not null default 'all_members',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gym_payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.gym_members(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null default 'paid',
  method text default 'cash',
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists gym_leads_gym_status_idx on public.gym_leads(gym_id, status, created_at desc);
create index if not exists gym_announcements_gym_created_idx on public.gym_announcements(gym_id, created_at desc);
create index if not exists gym_payments_gym_paid_idx on public.gym_payments(gym_id, paid_at desc);
