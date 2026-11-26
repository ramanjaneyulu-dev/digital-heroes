-- 003_draws.sql : draw engine persistence.
-- Run in Supabase SQL Editor AFTER 001 and 002. Safe to re-run (create or replace).
-- All functions are callable ONLY by the server's secret key (service_role).

-- 1) Prize pool available right now: each payment whose paid period covers "now"
--    contributes prize_pool_cents / billing_months (a yearly payment feeds 1/12 per draw).
create or replace function public.draw_pool_cents()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(floor(prize_pool_cents::numeric / billing_months)), 0)::bigint
  from public.payments
  where period_start <= now() and period_end > now();
$$;

-- 2) Jackpot carried in = rollover_out of the most recently PUBLISHED draw.
create or replace function public.current_rollover_cents()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rollover_out_cents from public.draws
      where status = 'published' order by published_at desc limit 1), 0)::bigint;
$$;

-- 3) Eligible entrants: active, paid-up subscription AND exactly 5 stored scores.
--    Ordered by user_id so the app can page through with range().
create or replace function public.draw_eligible_entries()
returns table (user_id uuid, scores int[])
language sql stable security definer set search_path = public as $$
  select s.user_id, array_agg(s.score order by s.played_on desc) as scores
  from public.scores s
  join public.subscriptions sub on sub.user_id = s.user_id
  where sub.status = 'active' and sub.current_period_end > now()
  group by s.user_id
  having count(*) = 5
  order by s.user_id;
$$;

-- 4) Publish a draw atomically. Locks the draw row, so a double-click or two admins
--    cannot publish twice; serialises with other publishes so rollover can't be double-spent.
create or replace function public.publish_draw(
  p_draw_id uuid,
  p_winning int[],
  p_entries jsonb,           -- [{user_id, scores[], match_count, tier|null}]
  p_winners jsonb,           -- [{user_id, tier, prize_cents}]
  p_active_subscribers int,
  p_pool_total bigint,       -- includes rollover_in
  p_rollover_in bigint,
  p_rollover_out bigint,
  p_config jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status public.draw_status;
  v_paid bigint;
  v_expected_in bigint;
  v_winner_count int;
begin
  perform pg_advisory_xact_lock(hashtext('publish_draw'));

  select status into v_status from public.draws where id = p_draw_id for update;
  if not found then raise exception 'draw_not_found'; end if;
  if v_status = 'published' then raise exception 'already_published'; end if;

  select public.current_rollover_cents() into v_expected_in;
  if v_expected_in <> p_rollover_in then raise exception 'rollover_changed'; end if;

  if array_length(p_winning, 1) is distinct from 5 then raise exception 'bad_winning_numbers'; end if;

  select coalesce(sum((w->>'prize_cents')::bigint), 0) into v_paid from jsonb_array_elements(p_winners) w;
  if v_paid + p_rollover_out > p_pool_total then raise exception 'prizes_exceed_pool'; end if;

  insert into public.draw_entries (draw_id, user_id, scores, match_count, tier)
  select p_draw_id,
         (e->>'user_id')::uuid,
         array(select x::int from jsonb_array_elements_text(e->'scores') with ordinality t(x, i) order by i),
         (e->>'match_count')::int,
         nullif(e->>'tier', '')::public.match_tier
  from jsonb_array_elements(p_entries) e;

  insert into public.winners (draw_id, entry_id, user_id, tier, prize_cents, verification, payout)
  select p_draw_id, de.id, de.user_id, (w->>'tier')::public.match_tier, (w->>'prize_cents')::bigint,
         'none'::public.verification_status, 'pending'::public.payout_status
  from jsonb_array_elements(p_winners) w
  join public.draw_entries de on de.draw_id = p_draw_id and de.user_id = (w->>'user_id')::uuid;
  get diagnostics v_winner_count = row_count;
  if v_winner_count <> jsonb_array_length(p_winners) then raise exception 'winner_entry_mismatch'; end if;

  update public.draws set
    status = 'published',
    winning_numbers = p_winning,
    active_subscribers = p_active_subscribers,
    pool_total_cents = p_pool_total,
    rollover_in_cents = p_rollover_in,
    rollover_out_cents = p_rollover_out,
    config_snapshot = p_config,
    published_at = now()
  where id = p_draw_id;
end $$;

-- Lock everything down to the server's secret key.
do $$
declare f text;
begin
  foreach f in array array[
    'draw_pool_cents()', 'current_rollover_cents()', 'draw_eligible_entries()',
    'publish_draw(uuid,int[],jsonb,jsonb,int,bigint,bigint,bigint,jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
