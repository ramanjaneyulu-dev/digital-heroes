-- =====================================================================
-- 004_charities.sql : charity directory, independent donations, public totals
-- Run in Supabase SQL Editor AFTER 001, 002, 003. Safe to re-run.
-- =====================================================================

-- Categories power the directory filter.
alter table charities add column if not exists category text;
update charities set category = case slug
    when 'bright-futures' then 'Education'
    when 'clean-water'    then 'Water'
    when 'green-earth'    then 'Environment'
    when 'hope-health'    then 'Health'
    else category end
where category is null;

-- Sample upcoming events (only inserted while the table is empty).
insert into charity_events (charity_id, title, event_date, location, description)
select c.id, e.title, current_date + e.days, e.location, e.description
from charities c
join (values
  ('bright-futures', 'Charity Golf Day for School Kits', 21, 'Bengaluru',  'A friendly 9-hole day. Every entry funds school kits for 20 children.'),
  ('clean-water',    'Fairway Fundraiser for Village Wells', 35, 'Hyderabad', 'Play, dine and help dig the next community well.'),
  ('green-earth',    'Tee Off for Trees', 49, 'Chennai', 'Each birdie sponsors a sapling planted the same week.'),
  ('hope-health',    'Hope Health Camp Day', 28, 'Kurnool', 'Free health camp with volunteers and a short charity golf morning.')
) as e(slug, title, days, location, description) on e.slug = c.slug
where not exists (select 1 from charity_events);

-- Donations: only known states, and make sure the public can read what they need.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'donations_status_check') then
    alter table donations add constraint donations_status_check check (status in ('pending', 'paid', 'failed'));
  end if;
end $$;
create index if not exists idx_donations_user on donations(user_id, created_at desc);
create index if not exists idx_charities_active on charities(is_active, is_featured);

grant select on charities, charity_events, plans, settings to anon, authenticated;

-- Public bucket for charity images (admins upload with the secret key; anyone can view).
insert into storage.buckets (id, name, public) values ('charity-media', 'charity-media', true)
on conflict (id) do nothing;

-- Aggregate-only public numbers (no personal data): what each charity has raised.
create or replace function public.charity_totals()
returns table (charity_id uuid, raised_cents bigint, supporters bigint)
language sql stable security definer set search_path = public as $$
  select c.id,
         (coalesce(p.cents, 0) + coalesce(d.cents, 0))::bigint,
         coalesce(p.sup, 0)::bigint
  from charities c
  left join (select charity_id, sum(charity_cents) as cents, count(distinct user_id) as sup
             from payments group by charity_id) p on p.charity_id = c.id
  left join (select charity_id, sum(amount_cents) as cents
             from donations where status = 'paid' group by charity_id) d on d.charity_id = c.id
  where c.is_active;
$$;

create or replace function public.total_raised_cents()
returns bigint language sql stable security definer set search_path = public as $$
  select (coalesce((select sum(charity_cents) from payments), 0)
        + coalesce((select sum(amount_cents) from donations where status = 'paid'), 0))::bigint;
$$;

grant execute on function public.charity_totals()      to anon, authenticated, service_role;
grant execute on function public.total_raised_cents()  to anon, authenticated, service_role;
