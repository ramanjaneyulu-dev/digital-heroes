-- =====================================================================
-- DIGITAL HEROES · Step 2: payments, subscriptions lifecycle
-- Run once in Supabase -> SQL Editor -> New query (after schema.sql)
-- =====================================================================

-- ---------- Pricing in INR (stored in paise) and currency setting ----
update plans set price_cents = 49900  where id = 'monthly';   -- Rs 499 / month
update plans set price_cents = 499000 where id = 'yearly';    -- Rs 4,990 / year (2 months free)
insert into settings (key, value) values ('currency', '"INR"') on conflict (key) do nothing;

-- ---------- Checkout sessions (one per attempt to pay) ----------------
create type payment_status as enum ('pending', 'paid', 'failed', 'expired');

create table payment_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  plan_id        text not null references plans(id),
  charity_id     uuid references charities(id) on delete set null,
  charity_pct    numeric(5,2) not null check (charity_pct >= 10 and charity_pct <= 100),
  amount_cents   integer not null check (amount_cents > 0),
  provider       text not null default 'demo',
  status         payment_status not null default 'pending',
  failure_reason text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index idx_payment_sessions_user on payment_sessions(user_id, created_at desc);

-- ---------- Payments ledger (the source of truth for money) -----------
-- Every successful charge is split into charity / prize pool / platform.
-- provider_payment_id is UNIQUE, so replaying the same event can never double-count.
create table payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  session_id          uuid references payment_sessions(id) on delete set null,
  plan_id             text not null references plans(id),
  provider            text not null,
  provider_payment_id text not null unique,
  kind                text not null check (kind in ('initial', 'renewal')),
  amount_cents        integer not null check (amount_cents > 0),
  charity_id          uuid references charities(id) on delete set null,
  charity_pct         numeric(5,2) not null,
  charity_cents       integer not null check (charity_cents >= 0),
  prize_pool_cents    integer not null check (prize_pool_cents >= 0),
  platform_cents      integer not null check (platform_cents >= 0),
  billing_months      integer not null check (billing_months in (1, 12)),
  period_start        timestamptz not null,
  period_end          timestamptz not null,
  created_at          timestamptz not null default now(),
  check (charity_cents + prize_pool_cents + platform_cents = amount_cents)
);
create index idx_payments_user    on payments(user_id, created_at desc);
create index idx_payments_charity on payments(charity_id);
create index idx_payments_period  on payments(period_start, period_end);

-- ---------- Row Level Security ----------------------------------------
alter table payment_sessions enable row level security;
alter table payments         enable row level security;

create policy sessions_read_own on payment_sessions for select using (user_id = auth.uid() or is_admin());
create policy sessions_admin    on payment_sessions for all    using (is_admin()) with check (is_admin());
create policy payments_read_own on payments         for select using (user_id = auth.uid() or is_admin());
create policy payments_admin    on payments         for all    using (is_admin()) with check (is_admin());
-- No insert/update policies for normal users: money is only written by the
-- server (secret key) through the functions below.

grant select on payment_sessions, payments to authenticated;
grant all    on payment_sessions, payments to service_role;

-- ---------- "Active" now also means "not past the paid period" --------
create or replace function has_active_subscription() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = auth.uid()
      and status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- ---------- Core money logic (atomic + idempotent) --------------------
create or replace function _apply_payment(
  p_user uuid, p_plan text, p_charity uuid, p_pct numeric, p_provider text,
  p_provider_payment_id text, p_kind text, p_session uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_plan         plans%rowtype;
  v_share        numeric;
  v_charity      integer;
  v_remainder    integer;
  v_pool         integer;
  v_platform     integer;
  v_existing_end timestamptz;
  v_start        timestamptz;
  v_end          timestamptz;
  v_id           uuid;
begin
  select * into v_plan from plans where id = p_plan;
  if not found then raise exception 'Unknown plan %', p_plan; end if;

  -- prize pool share of the fee (after the charity cut), configurable in settings
  select (value #>> '{}')::numeric into v_share from settings where key = 'prize_pool_share';
  v_share := coalesce(v_share, 0.5);

  v_charity   := round(v_plan.price_cents * p_pct / 100.0);
  v_remainder := v_plan.price_cents - v_charity;
  v_pool      := floor(v_remainder * v_share);
  v_platform  := v_remainder - v_pool;

  -- extend from the current period end if still paid up, otherwise start now
  select current_period_end into v_existing_end
  from subscriptions where user_id = p_user and status = 'active';
  v_start := case when v_existing_end is not null and v_existing_end > now()
                  then v_existing_end else now() end;
  v_end := v_start + make_interval(months => v_plan.billing_months);

  insert into payments (
    user_id, session_id, plan_id, provider, provider_payment_id, kind,
    amount_cents, charity_id, charity_pct, charity_cents, prize_pool_cents,
    platform_cents, billing_months, period_start, period_end
  ) values (
    p_user, p_session, p_plan, p_provider, p_provider_payment_id, p_kind,
    v_plan.price_cents, p_charity, p_pct, v_charity, v_pool,
    v_platform, v_plan.billing_months, v_start, v_end
  )
  on conflict (provider_payment_id) do nothing
  returning id into v_id;

  if v_id is null then
    return null;   -- this payment was already recorded; nothing more to do
  end if;

  insert into subscriptions (user_id, plan_id, status, provider_subscription_id,
                             current_period_end, cancel_at_period_end, updated_at)
  values (p_user, p_plan, 'active', p_provider || '_sub_' || left(p_user::text, 8),
          v_end, false, now())
  on conflict (user_id) do update set
    plan_id                  = excluded.plan_id,
    status                   = 'active',
    provider_subscription_id = coalesce(subscriptions.provider_subscription_id,
                                        excluded.provider_subscription_id),
    current_period_end       = excluded.current_period_end,
    cancel_at_period_end     = false,
    updated_at               = now();

  if p_kind = 'initial' then
    update profiles set charity_id = p_charity, charity_pct = p_pct where id = p_user;
  end if;

  return v_id;
end $$;

-- Called when a checkout session is paid successfully
create or replace function complete_checkout(p_session_id uuid, p_provider_payment_id text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s    payment_sessions%rowtype;
  v_id uuid;
begin
  select * into s from payment_sessions where id = p_session_id for update;
  if not found then raise exception 'Checkout session not found'; end if;
  if s.status = 'paid' then return null; end if;               -- already processed
  if s.status <> 'pending' then raise exception 'Checkout session is %', s.status; end if;

  v_id := _apply_payment(s.user_id, s.plan_id, s.charity_id, s.charity_pct,
                         s.provider, p_provider_payment_id, 'initial', s.id);
  update payment_sessions set status = 'paid', completed_at = now() where id = s.id;
  return v_id;
end $$;

-- Called when the card is declined
create or replace function fail_checkout(p_session_id uuid, p_reason text)
returns void
language sql security definer set search_path = public as $$
  update payment_sessions
  set status = 'failed', failure_reason = p_reason, completed_at = now()
  where id = p_session_id and status = 'pending';
$$;

-- Called for each renewal charge
create or replace function renew_subscription(p_user_id uuid, p_provider_payment_id text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  sub     subscriptions%rowtype;
  v_chid  uuid;
  v_pct   numeric;
begin
  select * into sub from subscriptions where user_id = p_user_id;
  if not found or sub.plan_id is null then raise exception 'No subscription to renew'; end if;
  if sub.cancel_at_period_end then raise exception 'Subscription is set to cancel'; end if;

  select charity_id, charity_pct into v_chid, v_pct from profiles where id = p_user_id;
  return _apply_payment(p_user_id, sub.plan_id, v_chid, v_pct, 'demo',
                        p_provider_payment_id, 'renewal', null);
end $$;

-- These functions move money records: only the server (secret key) may call them.
revoke execute on function _apply_payment(uuid, text, uuid, numeric, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function complete_checkout(uuid, text)   from public, anon, authenticated;
revoke execute on function fail_checkout(uuid, text)       from public, anon, authenticated;
revoke execute on function renew_subscription(uuid, text)  from public, anon, authenticated;
grant  execute on function complete_checkout(uuid, text)   to service_role;
grant  execute on function fail_checkout(uuid, text)       to service_role;
grant  execute on function renew_subscription(uuid, text)  to service_role;
