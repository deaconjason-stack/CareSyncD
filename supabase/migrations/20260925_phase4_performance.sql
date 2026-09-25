-- Phase 4 Supabase performance follow-up.
-- Adds covering indexes for foreign keys and optimizes auth.uid() RLS checks.

create index if not exists audit_log_actor_id_idx
  on public.audit_log(actor_id);

create index if not exists entitlement_snapshots_plan_id_idx
  on public.entitlement_snapshots(plan_id);

create index if not exists entitlement_snapshots_subscription_id_idx
  on public.entitlement_snapshots(subscription_id);

create index if not exists price_versions_created_by_idx
  on public.price_versions(created_by);

create index if not exists price_versions_plan_id_idx
  on public.price_versions(plan_id);

create index if not exists pricing_change_approvals_founder_id_idx
  on public.pricing_change_approvals(founder_id);

create index if not exists pricing_change_requests_previous_price_version_id_idx
  on public.pricing_change_requests(previous_price_version_id);

create index if not exists pricing_change_requests_proposed_price_version_id_idx
  on public.pricing_change_requests(proposed_price_version_id);

create index if not exists pricing_change_requests_requested_by_idx
  on public.pricing_change_requests(requested_by);

create index if not exists subscriptions_plan_id_idx
  on public.subscriptions(plan_id);

create index if not exists subscriptions_price_version_id_idx
  on public.subscriptions(price_version_id);

drop policy if exists "account_profiles_select_own" on public.account_profiles;
create policy "account_profiles_select_own" on public.account_profiles
  for select to authenticated
  using ((select auth.uid()) = account_id);

drop policy if exists "account_profiles_insert_own" on public.account_profiles;
create policy "account_profiles_insert_own" on public.account_profiles
  for insert to authenticated
  with check ((select auth.uid()) = account_id);

drop policy if exists "account_profiles_update_own" on public.account_profiles;
create policy "account_profiles_update_own" on public.account_profiles
  for update to authenticated
  using ((select auth.uid()) = account_id)
  with check ((select auth.uid()) = account_id);

drop policy if exists "account_roles_select_own" on public.account_roles;
create policy "account_roles_select_own" on public.account_roles
  for select to authenticated
  using ((select auth.uid()) = account_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = account_id);

drop policy if exists "entitlement_snapshots_select_own" on public.entitlement_snapshots;
create policy "entitlement_snapshots_select_own" on public.entitlement_snapshots
  for select to authenticated
  using ((select auth.uid()) = account_id);
