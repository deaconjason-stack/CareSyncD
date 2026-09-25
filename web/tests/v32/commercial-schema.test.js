import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../../../supabase/migrations/20260925_phase4_commercial.sql', import.meta.url);

async function sql() {
  return (await readFile(migrationUrl, 'utf8')).toLowerCase().replace(/\s+/g,' ');
}

const requiredTables = [
  'account_profiles','account_roles','plans','price_versions','plan_entitlements',
  'subscriptions','payment_events','entitlement_snapshots','pricing_change_requests',
  'pricing_change_approvals','audit_log'
];

test('commercial migration defines every Phase 4 table', async () => {
  const text = await sql();
  for (const table of requiredTables) {
    assert.match(text,new RegExp(`create table(?: if not exists)? (?:public\\.)?${table}\\b`),`missing ${table}`);
  }
});

test('row level security is enabled on every commercial table', async () => {
  const text = await sql();
  for (const table of requiredTables) {
    assert.match(text,new RegExp(`alter table (?:public\\.)?${table} enable row level security`),`RLS missing for ${table}`);
  }
});

test('provider webhook event ids and provider subscriptions are unique', async () => {
  const text = await sql();
  assert.match(text,/unique\s*\(\s*provider\s*,\s*provider_event_id\s*\)/);
  assert.match(text,/unique\s*\(\s*provider\s*,\s*provider_subscription_id\s*\)/);
});

test('learners can read only their own profile, subscription and entitlement records', async () => {
  const text = await sql();
  assert.match(text,/create policy "account_profiles_select_own"[\s\S]*?auth\.uid\(\)\s*=\s*account_id/);
  assert.match(text,/create policy "subscriptions_select_own"[\s\S]*?auth\.uid\(\)\s*=\s*account_id/);
  assert.match(text,/create policy "entitlement_snapshots_select_own"[\s\S]*?auth\.uid\(\)\s*=\s*account_id/);
});

test('subscription and payment mutation are server-controlled rather than public RLS writes', async () => {
  const text = await sql();
  assert.doesNotMatch(text,/create policy "[^"]*subscriptions[^"]*" on (?:public\.)?subscriptions for (?:insert|update|delete|all)/);
  assert.doesNotMatch(text,/create policy "[^"]*payment_events[^"]*" on (?:public\.)?payment_events for (?:insert|update|delete|all)/);
});

test('commercial records enforce approved plan, cadence, billing, access and role values', async () => {
  const text = await sql();
  for (const token of ['individual','instructor','organization','monthly','yearly','registered_demo','payment_issue','premium','founder','admin']) {
    assert.ok(text.includes(`'${token}'`),`missing constrained value ${token}`);
  }
});

test('no payment card fields are introduced', async () => {
  const text = await sql();
  assert.doesNotMatch(text,/card_number|card_cvv|security_code|pan_number/);
});
