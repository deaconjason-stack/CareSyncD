# CareSyncD v3.2 Phase 4 — Commercial Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the secure commercial domain for CareSyncD v3.2: versioned pricing, subscription lifecycle, verified entitlements, provider-neutral PayPal event handling, and a Supabase-ready backend schema without changing v3.1 production.

**Architecture:** Keep the Living Hospital simulation local-first. Add pure, testable commercial-domain modules under `web/src/commercial/`, with Supabase isolated behind adapters and server/Edge Function boundaries. Browser code may display subscription state but cannot create premium authority; verified server entitlement snapshots are the only source of paid access.

**Tech Stack:** Node.js 22 ESM, Node test runner, static PWA, PostgreSQL/Supabase migrations, Supabase Edge Functions (Deno/TypeScript), PayPal subscription webhooks.

**Spec:** `docs/superpowers/specs/2026-09-24-caresyncd-v3.2-living-hospital-design.md`

## Global Constraints

- Work only on `v3.2-living-hospital`; do not change `main` or `gh-pages`.
- Educational simulation only; no real-patient diagnosis, monitoring, treatment, or clinical decision support.
- No PHI collection by design.
- Individual, Instructor, and Organization/School plans support monthly/yearly billing.
- PayPal is first payment provider; core billing logic remains provider-neutral.
- Browser checkout state alone never grants premium access.
- Existing subscribers are grandfathered by default.
- Founder approval is required for base-price changes of 10% or more, removal of grandfathering, removal of a cadence, material entitlement movement, or promotions/discounts greater than 25%.
- Failed-payment grace defaults to 3 days.
- Offline premium entitlement cache is valid for no more than 7 days.
- An active shift may finish if entitlement changes mid-shift; new premium sessions require current entitlement.
- Secrets, service-role credentials, PayPal credentials, and Founder-only authority never ship in the public frontend.
- No payment-card data is stored by CareSyncD.

## Review Focus

1. Forged browser state must remain demo-only unless backed by a verified entitlement snapshot.
2. Duplicate or out-of-order payment events must not double-apply or regress a newer subscription state.
3. Price edits at exactly the 10% threshold and promotions above 25% must require Founder approval.
4. An entitlement snapshot older than seven days must not unlock a new premium shift offline, while a shift begun under valid entitlement may finish.
5. Supabase RLS must prevent one learner from reading/writing another learner's subscription/entitlement records and must keep business-admin mutations server-controlled.

---

### Task 1: Pricing catalog and approval policy

**Files:**
- Create: `web/src/commercial/pricing-catalog.js`
- Test: `web/tests/v32/pricing-catalog.test.js`

**Interfaces:**
- Produces: `PLAN_IDS`, `BILLING_CADENCES`, `createPriceVersion(input)`, `classifyPricingChange(previous, next)`.
- `classifyPricingChange` returns `{ major:boolean, reasons:string[] }`.

- [ ] **Step 1: Write the failing tests** for three plan IDs, two cadences, immutable versioned prices, exact 10% base-price change, >25% promotion, cadence removal, grandfathering removal, and entitlement movement.
- [ ] **Step 2: Trigger the branch verification gate and confirm RED** because `pricing-catalog.js` does not exist.
- [ ] **Step 3: Implement the minimum pure pricing module.** Use integer cents, reject negative/non-integer prices, freeze returned records, and compare entitlement sets independent of ordering.
- [ ] **Step 4: Trigger the gate and confirm GREEN.**
- [ ] **Step 5: Commit** with `feat: add versioned pricing policy`.

### Task 2: Subscription lifecycle reducer

**Files:**
- Create: `web/src/commercial/subscription-state.js`
- Test: `web/tests/v32/subscription-state.test.js`

**Interfaces:**
- Produces: `SUBSCRIPTION_STATES`, `createDemoSubscription(accountId)`, `reduceSubscription(current, event, options)`.
- Event shape: `{ id, type, occurredAt, verified, provider, providerSubscriptionId?, paidThrough?, priceVersionId? }`.

- [ ] **Step 1: Write failing tests** for demo → active, payment issue → 3-day grace, canceled remaining active through paid-through, expiry, resubscription, preserved price version/grandfathering, and invalid transition rejection.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Implement lifecycle reducer** with explicit effective access status separate from billing state.
- [ ] **Step 4: Confirm GREEN.**
- [ ] **Step 5: Commit** with `feat: add subscription lifecycle`.

### Task 3: Verified entitlements and offline grace

**Files:**
- Create: `web/src/commercial/entitlement-engine.js`
- Test: `web/tests/v32/entitlement-engine.test.js`

**Interfaces:**
- Produces: `createEntitlementSnapshot(input)`, `evaluateEntitlement(snapshot, context)`.
- Snapshot requires `verifiedByServer:true`, `issuedAt`, `expiresAt`, `accountId`, `planId`, `features`.
- Context: `{ now, offline, startingNewShift, activeShiftStartedAt? }`.

- [ ] **Step 1: Write failing tests** proving browser-spoofed/unverified snapshots are demo-only, server snapshots work, cache over seven days is rejected, and active shifts begun while valid may finish after expiry.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Implement entitlement evaluation** with a hard seven-day cache ceiling and explicit `demo`, `premium`, and `finish-active-only` outcomes.
- [ ] **Step 4: Confirm GREEN.**
- [ ] **Step 5: Commit** with `feat: enforce verified entitlements`.

### Task 4: Provider-neutral payment event reducer

**Files:**
- Create: `web/src/commercial/payment-events.js`
- Test: `web/tests/v32/payment-events.test.js`

**Interfaces:**
- Produces: `normalizePaymentEvent(providerPayload)`, `applyPaymentEvent(state, event)`.
- State tracks `processedEventIds`, `lastOccurredAt`, and current subscription.

- [ ] **Step 1: Write failing tests** for unverified rejection, duplicate-id idempotency, stale-event no-regression, active/canceled/payment-failed/expired mappings, and provider independence.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Implement reducer** so only `verified:true` normalized server events affect state and older events cannot overwrite newer state.
- [ ] **Step 4: Confirm GREEN.**
- [ ] **Step 5: Commit** with `feat: add idempotent payment reducer`.

### Task 5: Supabase-ready commercial database schema

**Files:**
- Create: `supabase/migrations/20260925_phase4_commercial.sql`
- Create: `web/tests/v32/commercial-schema.test.js`

**Interfaces:**
- Database tables: `account_profiles`, `account_roles`, `plans`, `price_versions`, `plan_entitlements`, `subscriptions`, `payment_events`, `entitlement_snapshots`, `pricing_change_requests`, `pricing_change_approvals`, `audit_log`.

- [ ] **Step 1: Write a failing static schema test** requiring all tables, RLS enablement, uniqueness for provider event IDs, ownership policies for account-scoped reads, and no public policy permitting subscription/payment mutation.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Write the migration** with UUID primary keys, timestamps, checks/enums, foreign keys, indexes, RLS, user-readable own-account policies, and server-only business mutation assumptions.
- [ ] **Step 4: Confirm GREEN in repository CI.**
- [ ] **Step 5: Commit** with `feat: add commercial Supabase schema`.

### Task 6: Supabase account adapter boundary

**Files:**
- Create: `web/src/commercial/account-adapter.js`
- Create: `web/src/commercial/supabase-account-adapter.js`
- Test: `web/tests/v32/account-adapter.test.js`

**Interfaces:**
- `AccountAdapter` contract: `getSession()`, `getProfile()`, `getVerifiedEntitlement()`, `saveProgressEnvelope(envelope)`.
- `SupabaseAccountAdapter` accepts an injected Supabase-like client; no service-role key or vendor secret is embedded.

- [ ] **Step 1: Write failing tests** with a fake client proving account-scoped reads, adapter normalization, error propagation, and absence of service-role/browser secret assumptions.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Implement adapter boundary.**
- [ ] **Step 4: Confirm GREEN.**
- [ ] **Step 5: Commit** with `feat: add account backend adapter`.

### Task 7: PayPal webhook server boundary

**Files:**
- Create: `supabase/functions/paypal-webhook/index.ts`
- Create: `supabase/functions/paypal-webhook/deno.json`
- Create: `web/src/commercial/paypal-event-map.js`
- Test: `web/tests/v32/paypal-event-map.test.js`

**Interfaces:**
- `mapPayPalWebhook(payload, verification)` returns the provider-neutral event only when verification is successful.
- Edge Function receives PayPal webhook, verifies signature server-side using environment secrets, then persists normalized event/idempotency state.

- [ ] **Step 1: Write failing mapping tests** for approved verification, failed verification, subscription activated/canceled/suspended/payment-failed/expired event mappings, and event ID preservation.
- [ ] **Step 2: Trigger RED.**
- [ ] **Step 3: Implement pure PayPal mapper.**
- [ ] **Step 4: Add Edge Function source** with no credentials committed. It must reject missing signature metadata and failed PayPal verification before database mutation.
- [ ] **Step 5: Confirm GREEN and run secret-sensitive production checks.**
- [ ] **Step 6: Commit** with `feat: add PayPal webhook boundary`.

### Task 8: Phase 4 end-to-end acceptance

**Files:**
- Create: `web/tests/v32/phase4-integration.test.js`
- Modify: `.ci/v32-gate.txt`

**Interfaces:**
- Uses Tasks 1–7 only through their public functions.

- [ ] **Step 1: Write acceptance test** for demo → verified paid Individual subscription → premium entitlement → offline use → payment issue grace → cancel active through paid-through → expire → resubscribe; include duplicate and stale events plus browser spoof rejection.
- [ ] **Step 2: Run/trigger complete v3.2 suite twice.**
- [ ] **Step 3: Run preserved v3.1 suite and project/site/production checks.**
- [ ] **Step 4: Update `.ci/v32-gate.txt` to `phase4 commercial backend acceptance` and confirm the GitHub Actions verification gate concludes `success`.**
- [ ] **Step 5: Commit** with `test: verify Phase 4 commercial acceptance`.

### Task 9: Provision isolated Supabase development project

**Files:**
- No repository code changes until provisioning is approved.

**Interfaces:**
- Supabase organization is chosen explicitly by the user.
- Cost is retrieved and confirmed before project creation as required by the Supabase integration.

- [ ] **Step 1: Ask which Supabase organization to use for the new CareSyncD development project.**
- [ ] **Step 2: Retrieve the current project cost for that organization and present it exactly.**
- [ ] **Step 3: Obtain explicit cost confirmation.**
- [ ] **Step 4: Create a new project named `caresyncd-v32-dev`; do not reuse or modify existing projects.**
- [ ] **Step 5: Apply the repository migration only after the project reports healthy.**
- [ ] **Step 6: Run Supabase security/performance advisors and resolve Phase-4 schema findings.**
- [ ] **Step 7: Deploy the PayPal webhook function only after PayPal server credentials are available; never invent credentials.**

## Phase 4 Completion Gate

Phase 4 is complete only when Tasks 1–8 are green in GitHub Actions and Task 9 has either been provisioned with explicit cost approval or is accurately reported as the remaining external provisioning gate. No Phase 4 work changes v3.1 production deployment.