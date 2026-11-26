-- =====================================================================
-- 005_admin_reports.sql : aggregate functions for the admin dashboard & reports
-- Run AFTER 001-004. Safe to re-run. Callable ONLY by the server's secret key.
-- Aggregates are computed in the database (indexed, scales with growth).
-- =====================================================================

create or replace function public.admin_overview() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_users',                  (select count(*) from profiles),
    'new_users_30d',                (select count(*) from profiles where created_at > now() - interval '30 days'),
    'active_subscribers',           (select count(*) from subscriptions where status = 'active' and current_period_end > now()),
    'revenue_cents',                (select coalesce(sum(amount_cents), 0)   from payments),
    'charity_cents',                (select coalesce(sum(charity_cents), 0)  from payments),
    'platform_cents',               (select coalesce(sum(platform_cents), 0) from payments),
    'donations_cents',              (select coalesce(sum(amount_cents), 0)   from donations where status = 'paid'),
    'prize_pool_contributed_cents', (select coalesce(sum(prize_pool_cents), 0) from payments),
    'current_pool_cents',           public.draw_pool_cents(),
    'current_rollover_cents',       public.current_rollover_cents(),
    'draws_total',                  (select count(*) from draws),
    'draws_published',              (select count(*) from draws where status = 'published'),
    'prizes_awarded_cents',         (select coalesce(sum(prize_cents), 0) from winners),
    'prizes_paid_cents',            (select coalesce(sum(prize_cents), 0) from winners where payout = 'paid'),
    'pending_reviews',              (select count(*) from winners where verification = 'pending'),
    'pending_payouts',              (select count(*) from winners where verification = 'approved' and payout = 'pending')
  );
$$;

create or replace function public.admin_monthly(p_months int default 6)
returns table (month_start date, revenue_cents bigint, charity_cents bigint, prize_pool_cents bigint, new_users bigint)
language sql stable security definer set search_path = public as $$
  select m::date,
         coalesce(p.rev, 0)::bigint, coalesce(p.ch, 0)::bigint, coalesce(p.pool, 0)::bigint,
         coalesce(u.n, 0)::bigint
  from generate_series(date_trunc('month', now()) - make_interval(months => greatest(p_months, 1) - 1),
                       date_trunc('month', now()), interval '1 month') m
  left join (select date_trunc('month', created_at) mm, sum(amount_cents) rev,
                    sum(charity_cents) ch, sum(prize_pool_cents) pool
             from payments group by 1) p on p.mm = m
  left join (select date_trunc('month', created_at) mm, count(*) n from profiles group by 1) u on u.mm = m
  order by 1;
$$;

create or replace function public.admin_charity_totals()
returns table (charity_id uuid, name text, is_active boolean, contributions_cents bigint, donations_cents bigint, supporters bigint)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.is_active,
         coalesce(p.cents, 0)::bigint, coalesce(d.cents, 0)::bigint, coalesce(p.sup, 0)::bigint
  from charities c
  left join (select charity_id, sum(charity_cents) cents, count(distinct user_id) sup
             from payments group by charity_id) p on p.charity_id = c.id
  left join (select charity_id, sum(amount_cents) cents
             from donations where status = 'paid' group by charity_id) d on d.charity_id = c.id
  order by (coalesce(p.cents, 0) + coalesce(d.cents, 0)) desc, c.name;
$$;

create or replace function public.admin_draw_stats(p_limit int default 12)
returns table (draw_id uuid, label text, draw_month date, mode draw_mode, status draw_status,
               pool_total_cents bigint, rollover_in_cents bigint, rollover_out_cents bigint,
               entrants bigint, winners bigint, paid_out_cents bigint, published_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, d.label, d.draw_month, d.mode, d.status,
         d.pool_total_cents, d.rollover_in_cents, d.rollover_out_cents,
         (select count(*) from draw_entries e where e.draw_id = d.id),
         (select count(*) from winners w where w.draw_id = d.id),
         (select coalesce(sum(w.prize_cents), 0) from winners w where w.draw_id = d.id and w.payout = 'paid')::bigint,
         d.published_at
  from draws d
  order by d.draw_month desc, d.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

do $$
declare f text;
begin
  foreach f in array array['admin_overview()', 'admin_monthly(int)', 'admin_charity_totals()', 'admin_draw_stats(int)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
