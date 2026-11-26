-- =====================================================================
-- DIGITAL HEROES · Supabase schema
-- Run the whole file once in: Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

-- ---------- ENUMS ----------------------------------------------------
create type user_role           as enum ('subscriber', 'admin');   -- visitors are simply anonymous
create type sub_status          as enum ('inactive', 'active', 'past_due', 'canceled', 'lapsed');
create type draw_status         as enum ('draft', 'simulated', 'published');
create type draw_mode           as enum ('random', 'algorithmic_common', 'algorithmic_rare');
create type match_tier          as enum ('match_5', 'match_4', 'match_3');
create type verification_status as enum ('none', 'pending', 'approved', 'rejected');
create type payout_status       as enum ('pending', 'paid');

-- ---------- CHARITIES ------------------------------------------------
create table charities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  is_featured boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table charity_events (
  id          uuid primary key default gen_random_uuid(),
  charity_id  uuid not null references charities(id) on delete cascade,
  title       text not null,
  event_date  date,
  location    text,
  description text,
  created_at  timestamptz not null default now()
);
create index idx_charity_events_charity on charity_events(charity_id);

-- ---------- PROFILES (1:1 with auth.users) ---------------------------
create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text,
  full_name          text,
  role               user_role not null default 'subscriber',
  charity_id         uuid references charities(id) on delete set null,
  charity_pct        numeric(5,2) not null default 10
                       check (charity_pct >= 10 and charity_pct <= 100),  -- PRD: minimum 10%
  provider_customer_id text unique,
  created_at         timestamptz not null default now()
);

-- ---------- PLANS & SETTINGS (configurable, nothing hard-coded) ------
create table plans (
  id              text primary key,              -- 'monthly' | 'yearly'
  name            text not null,
  price_cents     integer not null check (price_cents > 0),
  billing_months  integer not null check (billing_months in (1, 12)),
  provider_plan_id text,
  is_active       boolean not null default true
);

create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- SUBSCRIPTIONS --------------------------------------------
create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references profiles(id) on delete cascade,
  plan_id                text references plans(id),
  status                 sub_status not null default 'inactive',
  provider_subscription_id text unique,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);
create index idx_subscriptions_status on subscriptions(status);

-- ---------- SCORES ---------------------------------------------------
create table scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  score      integer not null check (score between 1 and 45),   -- Stableford
  played_on  date not null,
  created_at timestamptz not null default now(),
  unique (user_id, played_on)                                    -- one score per date
);
create index idx_scores_user_date on scores(user_id, played_on desc);

-- Rolling retention, enforced at write time (PRD §05 + §14).
-- Rules: no future dates; keep only the latest 5; a new score replaces the oldest;
-- a score older than all 5 existing ones is rejected (it would be dropped instantly).
create or replace function enforce_score_rules() returns trigger
language plpgsql as $$
declare
  cnt int;
  oldest date;
begin
  if new.played_on > current_date then
    raise exception 'Score date cannot be in the future';
  end if;

  -- serialise concurrent inserts for the same user
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

  select count(*), min(played_on) into cnt, oldest
  from scores where user_id = new.user_id;

  if cnt >= 5 and new.played_on < oldest then
    raise exception 'This date is older than your 5 most recent scores';
  end if;

  if cnt >= 5 then
    delete from scores
    where id in (
      select id from scores
      where user_id = new.user_id
      order by played_on asc, created_at asc
      limit (cnt - 4)
    );
  end if;
  return new;
end $$;

create trigger trg_scores_rolling
before insert on scores
for each row execute function enforce_score_rules();

-- ---------- DONATIONS (independent of gameplay) ----------------------
create table donations (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references profiles(id) on delete set null,
  charity_id               uuid not null references charities(id),
  amount_cents             integer not null check (amount_cents > 0),
  provider_payment_id text unique,
  status                   text not null default 'pending',
  created_at               timestamptz not null default now()
);
create index idx_donations_charity on donations(charity_id);

-- ---------- DRAWS ----------------------------------------------------
create table draws (
  id                 uuid primary key default gen_random_uuid(),
  label              text not null,
  draw_month         date not null,            -- first day of the month; NOT unique -> several draws per month allowed
  mode               draw_mode not null default 'random',
  status             draw_status not null default 'draft',
  winning_numbers    integer[],
  active_subscribers integer,
  pool_total_cents   bigint not null default 0,
  rollover_in_cents  bigint not null default 0,
  rollover_out_cents bigint not null default 0,
  config_snapshot    jsonb,                    -- pool % and settings used, for auditability
  simulated_at       timestamptz,
  published_at       timestamptz,
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now(),
  check (winning_numbers is null or array_length(winning_numbers, 1) = 5)
);
create index idx_draws_status_month on draws(status, draw_month desc);

create table draw_entries (
  id          uuid primary key default gen_random_uuid(),
  draw_id     uuid not null references draws(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  scores      integer[] not null,              -- snapshot of the user's scores at draw time
  match_count integer not null default 0,
  tier        match_tier,
  unique (draw_id, user_id)
);
create index idx_draw_entries_draw on draw_entries(draw_id);
create index idx_draw_entries_user on draw_entries(user_id);

-- ---------- WINNERS --------------------------------------------------
create table winners (
  id           uuid primary key default gen_random_uuid(),
  draw_id      uuid not null references draws(id) on delete cascade,
  entry_id     uuid references draw_entries(id) on delete set null,
  user_id      uuid not null references profiles(id) on delete cascade,
  tier         match_tier not null,
  prize_cents  bigint not null check (prize_cents >= 0),
  proof_url    text,
  verification verification_status not null default 'none',
  payout       payout_status not null default 'pending',
  admin_note   text,
  reviewed_by  uuid references profiles(id),
  reviewed_at  timestamptz,
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (draw_id, user_id)
);
create index idx_winners_user on winners(user_id);
create index idx_winners_verification on winners(verification, payout);

-- ---------- HELPERS --------------------------------------------------
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function has_active_subscription() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = auth.uid() and status = 'active'
  );
$$;

-- auto-create a profile + empty subscription row when someone signs up
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into subscriptions (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- stop users from promoting themselves to admin
create or replace function block_role_escalation() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin() then
    raise exception 'Not allowed to change role';
  end if;
  return new;
end $$;

create trigger trg_profiles_role_guard
before update on profiles
for each row execute function block_role_escalation();

-- ---------- ROW LEVEL SECURITY ---------------------------------------
alter table charities      enable row level security;
alter table charity_events enable row level security;
alter table profiles       enable row level security;
alter table plans          enable row level security;
alter table settings       enable row level security;
alter table subscriptions  enable row level security;
alter table scores         enable row level security;
alter table donations      enable row level security;
alter table draws          enable row level security;
alter table draw_entries   enable row level security;
alter table winners        enable row level security;

-- Public content
create policy charities_read   on charities      for select using (is_active or is_admin());
create policy charities_admin  on charities      for all    using (is_admin()) with check (is_admin());
create policy events_read      on charity_events for select using (true);
create policy events_admin     on charity_events for all    using (is_admin()) with check (is_admin());
create policy plans_read       on plans          for select using (true);
create policy plans_admin      on plans          for all    using (is_admin()) with check (is_admin());
create policy settings_read    on settings       for select using (true);
create policy settings_admin   on settings       for all    using (is_admin()) with check (is_admin());

-- Profiles
create policy profiles_read_own    on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update_own  on profiles for update using (id = auth.uid() or is_admin())
                                                          with check (id = auth.uid() or is_admin());

-- Subscriptions (user writes happen only via the payment-gateway webhook using the service role)
create policy subs_read_own  on subscriptions for select using (user_id = auth.uid() or is_admin());
create policy subs_admin     on subscriptions for all    using (is_admin()) with check (is_admin());

-- Scores: only active subscribers can write; everyone sees only their own
create policy scores_read   on scores for select using (user_id = auth.uid() or is_admin());
create policy scores_insert on scores for insert with check (user_id = auth.uid() and has_active_subscription());
create policy scores_update on scores for update using (user_id = auth.uid() and has_active_subscription())
                                                with check (user_id = auth.uid() and has_active_subscription());
create policy scores_delete on scores for delete using (user_id = auth.uid() and has_active_subscription());
create policy scores_admin  on scores for all    using (is_admin()) with check (is_admin());

-- Donations (inserted by the server via service role)
create policy donations_read_own on donations for select using (user_id = auth.uid() or is_admin());
create policy donations_admin    on donations for all    using (is_admin()) with check (is_admin());

-- Draws: users only see published draws
create policy draws_read  on draws for select using (status = 'published' or is_admin());
create policy draws_admin on draws for all    using (is_admin()) with check (is_admin());

create policy entries_read_own on draw_entries for select using (
  is_admin() or (user_id = auth.uid()
                 and exists (select 1 from draws d where d.id = draw_id and d.status = 'published'))
);
create policy entries_admin on draw_entries for all using (is_admin()) with check (is_admin());

-- Winners: users read their own. Proof upload goes through a server action (service role)
-- so a user can never self-approve or change a payout state.
create policy winners_read_own on winners for select using (user_id = auth.uid() or is_admin());
create policy winners_admin    on winners for all    using (is_admin()) with check (is_admin());

-- ---------- STORAGE (winner proofs, private bucket) ------------------
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

create policy proofs_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- ---------- SEED: plans and settings ---------------------------------
insert into plans (id, name, price_cents, billing_months) values
  ('monthly', 'Monthly', 999,   1),
  ('yearly',  'Yearly',  9900, 12);   -- discounted vs 12 x monthly

insert into settings (key, value) values
  ('prize_pool_share', '0.5'),                                          -- 50% of each fee (after charity cut) feeds the pool
  ('pool_split',       '{"match_5": 40, "match_4": 35, "match_3": 25}'),
  ('rollover_tier',    '"match_5"');

-- ---------- SEED: sample charities -----------------------------------
insert into charities (name, slug, description, is_featured) values
  ('Bright Futures Education', 'bright-futures', 'Funds school supplies and scholarships for children in under-served communities.', true),
  ('Clean Water Initiative',   'clean-water',    'Builds community wells and water filtration systems in rural villages.',          false),
  ('Green Earth Trust',        'green-earth',    'Plants trees and restores local ecosystems across India.',                         false),
  ('Hope Health Foundation',   'hope-health',    'Provides free health camps and essential medicines to families in need.',          false);

-- =====================================================================
-- AFTER you sign up your own account in the app, make yourself admin:
--   update profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL';
-- =====================================================================
