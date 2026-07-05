-- RLS for SE7EN FIT gym owner module tables

alter table public.gym_leads enable row level security;
alter table public.gym_announcements enable row level security;
alter table public.gym_payments enable row level security;

drop policy if exists "Gym owners manage leads" on public.gym_leads;
create policy "Gym owners manage leads" on public.gym_leads
  for all to authenticated
  using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Gym owners manage announcements" on public.gym_announcements;
create policy "Gym owners manage announcements" on public.gym_announcements
  for all to authenticated
  using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "Gym owners manage payments" on public.gym_payments;
create policy "Gym owners manage payments" on public.gym_payments
  for all to authenticated
  using (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.owns_gym(gym_id, auth.uid()) or public.is_admin(auth.uid()));
