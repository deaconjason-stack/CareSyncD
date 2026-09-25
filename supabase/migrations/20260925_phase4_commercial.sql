create extension if not exists pgcrypto;

create table public.account_profiles (
  account_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_roles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('learner','instructor','organization_admin','admin','founder')),
  created_at timestamptz not null default now(),
  unique (account_id, role)
);

create table public.plans (
  id text primary key check (id in ('individual','instructor','organization')),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.price_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.plans(id) on delete restrict,
  cadence text not null check (cadence in ('monthly','yearly')),
  amount_cents bigint not null check (amount_cents >= 0),
  promotion_percent numeric(5,2) not null default 0 check (promotion_percent >= 0 and promotion_percent <= 100),
  grandfather_existing boolean not null default true,
  effective_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.plan_entitlements (
  price_version_id uuid not null references public.price_versions(id) on delete cascade,
  feature_key text not null,
  created_at timestamptz not null default now(),
  primary key (price_version_id, feature_key)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_subscription_id text not null,
  plan_id text not null references public.plans(id) on delete restrict,
  price_version_id uuid references public.price_versions(id) on delete restrict,
  billing_state text not null default 'registered_demo' check (billing_state in ('registered_demo','active','payment_issue','canceled','expired')),
  access_state text not null default 'demo' check (access_state in ('demo','premium')),
  grandfathered boolean not null default false,
  paid_through timestamptz,
  grace_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index subscriptions_account_id_idx on public.subscriptions(account_id);
create index subscriptions_status_idx on public.subscriptions(billing_state, access_state);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  verified boolean not null check (verified = true),
  payload jsonb not null default '{}'::jsonb,
  unique (provider, provider_event_id)
);

create index payment_events_subscription_id_idx on public.payment_events(subscription_id);
create index payment_events_occurred_at_idx on public.payment_events(occurred_at desc);

create table public.entitlement_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_id text not null references public.plans(id) on delete restrict,
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  verified_by_server boolean not null default true check (verified_by_server = true),
  created_at timestamptz not null default now(),
  check (expires_at > issued_at)
);

create index entitlement_snapshots_account_id_idx on public.entitlement_snapshots(account_id, issued_at desc);

create table public.pricing_change_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete restrict,
  previous_price_version_id uuid references public.price_versions(id) on delete restrict,
  proposed_price_version_id uuid not null references public.price_versions(id) on delete restrict,
  major boolean not null default false,
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.pricing_change_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.pricing_change_requests(id) on delete cascade,
  founder_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approved','rejected')),
  decided_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated by default as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.account_profiles enable row level security;
alter table public.account_roles enable row level security;
alter table public.plans enable row level security;
alter table public.price_versions enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.entitlement_snapshots enable row level security;
alter table public.pricing_change_requests enable row level security;
alter table public.pricing_change_approvals enable row level security;
alter table public.audit_log enable row level security;

create policy "account_profiles_select_own" on public.account_profiles
  for select to authenticated
  using (auth.uid() = account_id);

create policy "account_profiles_insert_own" on public.account_profiles
  for insert to authenticated
  with check (auth.uid() = account_id);

create policy "account_profiles_update_own" on public.account_profiles
  for update to authenticated
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "account_roles_select_own" on public.account_roles
  for select to authenticated
  using (auth.uid() = account_id);

create policy "plans_select_authenticated" on public.plans
  for select to authenticated
  using (true);

create policy "price_versions_select_authenticated" on public.price_versions
  for select to authenticated
  using (true);

create policy "plan_entitlements_select_authenticated" on public.plan_entitlements
  for select to authenticated
  using (true);

create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (auth.uid() = account_id);

create policy "entitlement_snapshots_select_own" on public.entitlement_snapshots
  for select to authenticated
  using (auth.uid() = account_id);

-- Intentionally no client mutation policies for subscriptions, payment_events,
-- pricing_change_requests, pricing_change_approvals, or audit_log.
-- Those mutations are performed by trusted server/Edge Function code using
-- service credentials that are never shipped to the browser.
