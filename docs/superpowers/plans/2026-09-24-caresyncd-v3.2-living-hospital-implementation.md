# CareSyncD v3.2 “The Living Hospital” Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CareSyncD v3.2 as a deterministic, local-first living-hospital career simulator with six connected units, competency progression, paid subscriptions, founder analytics, instructor/organization workflows, and optional cloud synchronization while preserving v3.1 as the production fallback.

**Architecture:** Keep v3.1 production untouched. Materialize its verified source into the v3.2 branch, then add a modular `living-hospital` domain beside the existing engines. Browser simulation remains local-first; Supabase provides authentication, cloud records, organizations, pricing, entitlements, analytics, and audit data; PayPal subscription state is accepted only after server-side verification.

**Tech Stack:** JavaScript ES modules, HTML/CSS, IndexedDB, Service Worker/PWA, Node.js 22, Node built-in test runner/custom existing test runner, Supabase Postgres/Auth/Edge Functions, PayPal Subscriptions/Webhooks, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-24-caresyncd-v3.2-living-hospital-design.md`

## Global Constraints

- CareSyncD remains educational simulation software; never present it as real-patient diagnosis, monitoring, treatment, or clinical decision support.
- No real patient data or PHI storage by design.
- v3.1 production remains untouched until v3.2 passes preview and acceptance testing.
- Initial units: Med-Surg, Emergency Department, Telemetry/Step-Down, ICU, Pediatrics, OB.
- Career domains: Clinical Judgment, Operations, Communication, Leadership.
- RN and LPN/LVN are distinct paths with configurable jurisdiction/facility scope profiles.
- Initial payment provider: PayPal; browser checkout state cannot grant paid entitlement.
- Default failed-payment grace period: 3 days.
- Default offline premium entitlement cache: maximum 7 days.
- Base-price changes of 10% or more require Founder approval.
- Promotions/discounts greater than 25% require Founder approval.
- Existing subscribers are grandfathered by default.
- Founder/Super Admin ownership cannot be removed or transferred by an ordinary Admin.
- Live instructor observation is opt-in for explicitly enabled sessions and must show a learner-visible observation indicator.
- GitHub Pages remains the public frontend; no secrets are committed to the public repository.

## Target File Structure

```text
web/
  index.html
  app.js
  styles.css
  manifest.webmanifest
  service-worker.js
  src/
    app/
      session-controller.js
      v32-controller.js
    living-hospital/
      hospital-clock.js
      hospital-world.js
      world-state.js
      trajectory-engine.js
      consequence-engine.js
      staffing-engine.js
      delegation-engine.js
      census-engine.js
      transfer-engine.js
      event-engine.js
      pressure-budget.js
      competency-engine.js
      career-engine.js
      debrief-engine.js
      replay-engine.js
      scope-policy.js
    units/
      med-surg.js
      emergency.js
      telemetry.js
      icu.js
      pediatrics.js
      ob.js
    commerce/
      entitlement-client.js
      pricing-client.js
      subscription-client.js
    cloud/
      auth-client.js
      sync-client.js
      analytics-client.js
      realtime-client.js
    persistence/
      v32-store.js
      migrations.js
  tests/
    v32/
      deterministic-world.test.js
      trajectories.test.js
      staffing-delegation.test.js
      census-transfer.test.js
      events-pressure.test.js
      unit-packs.test.js
      career-competency.test.js
      debrief-replay.test.js
      persistence-sync.test.js
      entitlement.test.js
      ui-smoke.test.js
supabase/
  migrations/
    202609240001_v32_accounts.sql
    202609240002_v32_learning.sql
    202609240003_v32_commerce.sql
    202609240004_v32_organizations.sql
    202609240005_v32_analytics_audit.sql
  functions/
    paypal-webhook/index.ts
    entitlement/index.ts
    pricing-admin/index.ts
    analytics-ingest/index.ts
    sync-profile/index.ts
    live-session/index.ts
  tests/
    paypal-webhook.test.ts
    entitlement.test.ts
    admin-pricing.test.ts
    live-session.test.ts
.github/workflows/
  v32-ci.yml
  v32-preview.yml
```

## Review Focus

1. **Determinism:** the same seed, initial state, and learner action sequence must produce the same world/timeline; pinned in Task 3.
2. **Offline entitlement expiry:** an already-started shift must finish, but a new premium shift must not start after the 7-day cached entitlement window; pinned in Task 12.
3. **PayPal duplicate/out-of-order webhooks:** duplicate or older events must not double-charge entitlements or regress subscription state; pinned in Task 14.
4. **Cross-device sync conflict:** completed shifts merge, but conflicting active shifts are never silently overwritten; pinned in Task 11.
5. **Instructor disconnect:** learner simulation continues locally and observation catches up from event history after reconnect; pinned in Task 16.

---

### Task 1: Materialize the verified v3.1 source into the v3.2 branch

**Files:**
- Create: `web/**` from the verified `CareSyncD-Permanent-v3.1.0.zip`
- Modify: `.github/workflows/v32-ci.yml`
- Test: existing v3.1 tests copied under `web/tests/**`

**Interfaces:**
- Consumes: release archive reconstructed from existing `release/parts/*` and `release/tail/*`.
- Produces: a normal source tree under `web/` whose tests pass before any v3.2 behavior is added.

- [ ] **Step 1: Reconstruct the exact v3.1 archive and verify its checksum**

```bash
cat release/parts/part00.b64 release/parts/part01.b64 release/parts/part02.b64 release/parts/part03.b64 release/tail/tail00.b64 release/tail/tail01.b64 release/tail/tail02.b64 > /tmp/caresyncd-v31.b64
base64 --decode /tmp/caresyncd-v31.b64 > /tmp/CareSyncD-Permanent-v3.1.0.zip
echo '0e8e2bd52b89cde3b31a29de11014b27c739f7ef9d62c4ce2a8c2f8fba03de07  /tmp/CareSyncD-Permanent-v3.1.0.zip' | sha256sum --check
```

Expected: `OK`.

- [ ] **Step 2: Extract into `web/` and run the preserved v3.1 verification suite**

```bash
rm -rf web && mkdir web
unzip -q /tmp/CareSyncD-Permanent-v3.1.0.zip -d web
cd web
npm test
npm run check
npm run check:site
npm run check:production
```

Expected: all preserved tests/checks pass unchanged.

- [ ] **Step 3: Add v3.2 CI without changing production deployment**

Create `.github/workflows/v32-ci.yml` with checkout, Node 22, and:

```yaml
- name: Verify v3.2 branch
  working-directory: web
  run: |
    npm test
    npm run check
    npm run check:site
    npm run check:production
```

Trigger only on `v3.2-living-hospital` and pull requests targeting that branch.

- [ ] **Step 4: Run the suite again from repository root**

```bash
cd web && npm test && npm run check && npm run check:site && npm run check:production
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web .github/workflows/v32-ci.yml
git commit -m "build: materialize verified v3.1 source for v3.2"
```

### Task 2: Define v3.2 world-state contracts and validation

**Files:**
- Create: `web/src/living-hospital/world-state.js`
- Create: `web/src/living-hospital/scope-policy.js`
- Create: `web/tests/v32/world-state.test.js`

**Interfaces:**
- Consumes: existing scenario/shift data conventions from v3.1.
- Produces: `createWorldState(config)`, `validateWorldState(state)`, `createScopePolicy(profile)`.

- [ ] **Step 1: Write failing tests for required state shape**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldState, validateWorldState } from '../../src/living-hospital/world-state.js';

test('world state contains clock, units, staff, patients, events and timeline', () => {
  const state = createWorldState({ seed: 42, difficulty: 'guided', shiftFormat: 'training' });
  assert.equal(validateWorldState(state), true);
  assert.equal(state.seed, 42);
  assert.deepEqual(Object.keys(state.competencies), ['clinicalJudgment','operations','communication','leadership']);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
cd web && node --test tests/v32/world-state.test.js
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement the minimal immutable state factory**

```js
export function createWorldState({ seed, difficulty, shiftFormat }) {
  return {
    schemaVersion: 32,
    seed,
    difficulty,
    shiftFormat,
    clock: { minute: 0, running: false },
    units: {}, patients: {}, staff: {}, tasks: {}, events: [], timeline: [],
    competencies: { clinicalJudgment: 0, operations: 0, communication: 0, leadership: 0 }
  };
}

export function validateWorldState(state) {
  return state?.schemaVersion === 32 && Number.isInteger(state.seed) && !!state.clock;
}
```

Implement `createScopePolicy({ jurisdiction, facility, licenseType, rules })` as a pure object with `canPerform(actionId)` and `canDelegate(actionId, targetRole)`.

- [ ] **Step 4: Run tests**

```bash
cd web && node --test tests/v32/world-state.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/world-state.js web/src/living-hospital/scope-policy.js web/tests/v32/world-state.test.js
git commit -m "feat: define Living Hospital world contracts"
```

### Task 3: Implement deterministic hospital clock and world engine

**Files:**
- Create: `web/src/living-hospital/hospital-clock.js`
- Create: `web/src/living-hospital/hospital-world.js`
- Create: `web/tests/v32/deterministic-world.test.js`

**Interfaces:**
- Produces: `createHospitalClock({ minutesPerTick })`, `createHospitalWorld({ state, rng })`, `world.tick()`.
- `world.tick()` returns the next immutable state and records a timeline event.

- [ ] **Step 1: Write determinism test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSeededTicks } from './helpers/run-seeded-ticks.js';

test('same seed and actions produce identical timeline', () => {
  const a = runSeededTicks({ seed: 9876, ticks: 120, actions: [{ minute: 5, type: 'ASSESS' }] });
  const b = runSeededTicks({ seed: 9876, ticks: 120, actions: [{ minute: 5, type: 'ASSESS' }] });
  assert.deepEqual(a.timeline, b.timeline);
  assert.deepEqual(a.patients, b.patients);
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
cd web && node --test tests/v32/deterministic-world.test.js
```

Expected: FAIL until world engine exists.

- [ ] **Step 3: Implement deterministic tick order**

`hospital-world.js` must call in order: clock -> trajectories -> operations/staffing -> events -> consequences -> timeline/autosave hook. Inject RNG; never call `Math.random()` inside domain engines.

```js
export function createHospitalWorld({ state, rng, engines }) {
  return {
    tick() {
      let next = engines.clock.advance(state);
      next = engines.trajectories.advance(next, rng);
      next = engines.operations.advance(next, rng);
      next = engines.events.advance(next, rng);
      next = engines.consequences.advance(next, rng);
      return engines.timeline.recordTick(next);
    }
  };
}
```

- [ ] **Step 4: Run determinism test twice plus full suite**

```bash
cd web && node --test tests/v32/deterministic-world.test.js && npm test
```

Expected: PASS both times with identical state snapshots.

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/hospital-clock.js web/src/living-hospital/hospital-world.js web/tests/v32
git commit -m "feat: add deterministic Living Hospital world loop"
```

### Task 4: Add patient trajectories and consequence memory

**Files:**
- Create: `web/src/living-hospital/trajectory-engine.js`
- Create: `web/src/living-hospital/consequence-engine.js`
- Create: `web/tests/v32/trajectories.test.js`

**Interfaces:**
- Produces: `advanceTrajectories(state, rng)`, `recordDecision(state, decision)`, `resolveConsequences(state)`.

- [ ] **Step 1: Write failing branch-memory test**

```js
test('delayed reassessment changes later authored branch and debrief evidence', () => {
  const state = fixturePatient('sepsis-risk');
  const after = simulate(state, [{ minute: 5, type: 'ASSESS' }, { minute: 40, type: 'REASSESS' }]);
  assert.equal(after.patients.p1.trajectory.branch, 'delayed-recognition');
  assert.ok(after.timeline.some(e => e.kind === 'MISSED_WINDOW'));
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
cd web && node --test tests/v32/trajectories.test.js
```

- [ ] **Step 3: Implement authored trajectory transitions**

Represent each trajectory as states with guarded transitions, explicit timing windows, and evidence IDs. Never derive clinical branches from free-form generative output.

- [ ] **Step 4: Test improving, delayed, and critical branches**

```bash
cd web && node --test tests/v32/trajectories.test.js
```

Expected: PASS for all three authored branches.

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/trajectory-engine.js web/src/living-hospital/consequence-engine.js web/tests/v32/trajectories.test.js
git commit -m "feat: add trajectory and consequence memory"
```

### Task 5: Implement staffing and delegation queues

**Files:**
- Create: `web/src/living-hospital/staffing-engine.js`
- Create: `web/src/living-hospital/delegation-engine.js`
- Test: `web/tests/v32/staffing-delegation.test.js`

**Interfaces:**
- Produces: `assignStaff`, `setStaffAvailability`, `delegateTask`, `advanceDelegatedTasks`.

- [ ] **Step 1: Write tests for accepted, delayed, declined, overloaded and out-of-scope delegation**

```js
test('delegated task enters target workload and does not complete instantly', () => {
  const next = delegateTask(fixture(), { taskId: 'vitals-p2', staffId: 'cna-1' });
  assert.equal(next.tasks['vitals-p2'].status, 'delegated');
  assert.equal(next.staff['cna-1'].queue.includes('vitals-p2'), true);
});
```

- [ ] **Step 2: Run failing test**

```bash
cd web && node --test tests/v32/staffing-delegation.test.js
```

- [ ] **Step 3: Implement queue-based delegation with scope checks**

Require `scopePolicy.canDelegate(actionId, targetRole)` before assignment; rejected delegation records an evidence event instead of silently disappearing.

- [ ] **Step 4: Run tests**

```bash
cd web && node --test tests/v32/staffing-delegation.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/staffing-engine.js web/src/living-hospital/delegation-engine.js web/tests/v32/staffing-delegation.test.js
git commit -m "feat: add staffing and realistic delegation"
```

### Task 6: Implement census, beds, admissions, transfers and discharges

**Files:**
- Create: `web/src/living-hospital/census-engine.js`
- Create: `web/src/living-hospital/transfer-engine.js`
- Test: `web/tests/v32/census-transfer.test.js`

**Interfaces:**
- Produces: `requestAdmission`, `requestTransfer`, `markDischargeReady`, `advanceBedFlow`.

- [ ] **Step 1: Write failing bed-block test**

```js
test('transfer waits until destination bed, staffing, handoff and transport are ready', () => {
  const result = requestTransfer(blockedFixture(), { patientId: 'p1', toUnit: 'icu' });
  assert.equal(result.transfers.p1.status, 'waiting');
  assert.deepEqual(result.transfers.p1.blockers.sort(), ['bed','handoff','staffing','transport']);
});
```

- [ ] **Step 2: Run failing test**

```bash
cd web && node --test tests/v32/census-transfer.test.js
```

- [ ] **Step 3: Implement transition guards and bed-flow side effects**

A completed discharge frees a bed; a freed bed may satisfy a waiting admission/transfer on the next operations tick.

- [ ] **Step 4: Run tests**

```bash
cd web && node --test tests/v32/census-transfer.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/census-engine.js web/src/living-hospital/transfer-engine.js web/tests/v32/census-transfer.test.js
git commit -m "feat: add connected hospital bed flow"
```

### Task 7: Add event engine and pressure budgets

**Files:**
- Create: `web/src/living-hospital/event-engine.js`
- Create: `web/src/living-hospital/pressure-budget.js`
- Test: `web/tests/v32/events-pressure.test.js`

**Interfaces:**
- Produces: `eligibleEvents(state)`, `scheduleEvent(state, event)`, `consumePressure(state, cost)`.

- [ ] **Step 1: Write tests that Guided blocks overload while Challenge permits authored overlap**

```js
test('guided mode rejects event when pressure budget would be exceeded', () => {
  const state = guidedAtPressureLimit();
  assert.equal(scheduleEvent(state, highCostEvent()).accepted, false);
});
```

- [ ] **Step 2: Run failing tests**

```bash
cd web && node --test tests/v32/events-pressure.test.js
```

- [ ] **Step 3: Implement context-aware eligibility and mode budgets**

Events must declare `level`, `pressureCost`, `prerequisites`, and `cooldownKey`. Timers alone may not bypass prerequisites.

- [ ] **Step 4: Run tests with fixed seed**

```bash
cd web && node --test tests/v32/events-pressure.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/event-engine.js web/src/living-hospital/pressure-budget.js web/tests/v32/events-pressure.test.js
git commit -m "feat: add hospital events and pressure budgets"
```

### Task 8: Add all six specialty unit packs

**Files:**
- Create: `web/src/units/med-surg.js`
- Create: `web/src/units/emergency.js`
- Create: `web/src/units/telemetry.js`
- Create: `web/src/units/icu.js`
- Create: `web/src/units/pediatrics.js`
- Create: `web/src/units/ob.js`
- Test: `web/tests/v32/unit-packs.test.js`

**Interfaces:**
- Each module exports `unitDefinition` with `{ id, staffingModel, patientArchetypes, events, competencies, transferRules }`.

- [ ] **Step 1: Write contract tests for all six unit modules**

```js
for (const unit of allUnits) {
  test(`${unit.id} defines staff, events, archetypes and transfer rules`, () => {
    assert.ok(unit.staffingModel.length > 0);
    assert.ok(unit.patientArchetypes.length > 0);
    assert.ok(unit.events.length > 0);
    assert.ok(unit.transferRules.length > 0);
  });
}
```

- [ ] **Step 2: Run failing tests**

```bash
cd web && node --test tests/v32/unit-packs.test.js
```

- [ ] **Step 3: Implement unit definitions using authored data only**

Pediatrics uses age-dependent ranges and caregiver workflow; OB uses maternal/fetal simulation concepts and specialty escalation; neither reuses adult defaults without explicit mapping.

- [ ] **Step 4: Run unit tests plus clinical data validation**

```bash
cd web && node --test tests/v32/unit-packs.test.js && npm test
```

- [ ] **Step 5: Commit**

```bash
git add web/src/units web/tests/v32/unit-packs.test.js
git commit -m "feat: add six Living Hospital specialty units"
```

### Task 9: Implement career trees and competency gates

**Files:**
- Create: `web/src/living-hospital/competency-engine.js`
- Create: `web/src/living-hospital/career-engine.js`
- Test: `web/tests/v32/career-competency.test.js`

**Interfaces:**
- Produces: `recordCompetencyEvidence`, `evaluatePromotion`, `unlockSpecialty`, `unlockLeadershipRole`.

- [ ] **Step 1: Write a test proving XP alone cannot unlock Charge Nurse**

```js
test('promotion requires required competencies even with high XP', () => {
  const result = evaluatePromotion({ xp: 99999, evidence: [], targetRole: 'charge-nurse' });
  assert.equal(result.allowed, false);
  assert.ok(result.missing.includes('delegation'));
});
```

- [ ] **Step 2: Run failing test**

```bash
cd web && node --test tests/v32/career-competency.test.js
```

- [ ] **Step 3: Implement four-domain evidence and role requirements**

Evidence records contain `domain`, `competencyId`, `shiftId`, `timestamp`, `result`, and `sourceEventId`.

- [ ] **Step 4: Run tests for specialty and leadership progression**

```bash
cd web && node --test tests/v32/career-competency.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/competency-engine.js web/src/living-hospital/career-engine.js web/tests/v32/career-competency.test.js
git commit -m "feat: add competency-gated career progression"
```

### Task 10: Build evidence debrief and shift replay

**Files:**
- Create: `web/src/living-hospital/debrief-engine.js`
- Create: `web/src/living-hospital/replay-engine.js`
- Test: `web/tests/v32/debrief-replay.test.js`

**Interfaces:**
- Produces: `buildDebrief(timeline)`, `createReplay(timeline)`, `replay.atMinute(minute)`.

- [ ] **Step 1: Write timeline reconstruction test**

```js
test('debrief links missed window to later authored consequence', () => {
  const debrief = buildDebrief(fixtureTimeline());
  const item = debrief.evidence.find(e => e.id === 'reassessment-delay');
  assert.equal(item.domain, 'clinicalJudgment');
  assert.equal(item.downstreamEventId, 'deterioration-1');
});
```

- [ ] **Step 2: Run failing test**

```bash
cd web && node --test tests/v32/debrief-replay.test.js
```

- [ ] **Step 3: Implement evidence graph and replay snapshots**

Replay must derive from recorded world/timeline history; it must not rerun randomness.

- [ ] **Step 4: Run tests**

```bash
cd web && node --test tests/v32/debrief-replay.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/debrief-engine.js web/src/living-hospital/replay-engine.js web/tests/v32/debrief-replay.test.js
git commit -m "feat: add evidence debrief and shift replay"
```

### Task 11: Add v3.2 persistence, migrations and sync conflict semantics

**Files:**
- Create: `web/src/persistence/v32-store.js`
- Create: `web/src/persistence/migrations.js`
- Create: `web/src/cloud/sync-client.js`
- Test: `web/tests/v32/persistence-sync.test.js`

**Interfaces:**
- Produces: `saveSnapshot`, `loadActiveShift`, `exportProfile`, `importProfile`, `mergeCloudProfile`.

- [ ] **Step 1: Write conflict test**

```js
test('completed shifts merge but conflicting active shifts require choice', () => {
  const result = mergeCloudProfile(localProfile(), remoteProfileWithDifferentActiveShift());
  assert.equal(result.status, 'conflict');
  assert.equal(result.completedShifts.length, 2);
  assert.deepEqual(result.choices.sort(), ['local-active','remote-active']);
});
```

- [ ] **Step 2: Run failing test**

```bash
cd web && node --test tests/v32/persistence-sync.test.js
```

- [ ] **Step 3: Implement schema v32 IndexedDB records and migrations**

Autosave on meaningful state changes and at a bounded interval; export files include `schemaVersion: 32` and checksummed payload metadata.

- [ ] **Step 4: Run persistence and import-corruption tests**

```bash
cd web && node --test tests/v32/persistence-sync.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/persistence web/src/cloud/sync-client.js web/tests/v32/persistence-sync.test.js
git commit -m "feat: add v3.2 persistence and conflict-safe sync"
```

### Task 12: Implement entitlement client and offline grace rules

**Files:**
- Create: `web/src/commerce/entitlement-client.js`
- Test: `web/tests/v32/entitlement.test.js`

**Interfaces:**
- Produces: `canStartFeature(featureId, entitlement, now)`, `canContinueActiveShift(entitlement, shift)`.

- [ ] **Step 1: Write offline-expiry test**

```js
test('expired offline cache blocks new premium shift but allows active shift to finish', () => {
  const ent = fixtureEntitlement({ lastVerifiedDaysAgo: 8, status: 'active' });
  assert.equal(canStartFeature('icu-career-shift', ent, NOW), false);
  assert.equal(canContinueActiveShift(ent, { startedBeforeExpiry: true }), true);
});
```

- [ ] **Step 2: Run failing test**

```bash
cd web && node --test tests/v32/entitlement.test.js
```

- [ ] **Step 3: Implement feature entitlements with 7-day maximum cache**

Demo entitlements must be explicit feature IDs; UI hiding is not sufficient authorization.

- [ ] **Step 4: Run tests**

```bash
cd web && node --test tests/v32/entitlement.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/commerce/entitlement-client.js web/tests/v32/entitlement.test.js
git commit -m "feat: enforce paid and offline entitlements"
```

### Task 13: Create Supabase schema, RLS, authentication and audit foundation

**Files:**
- Create: `supabase/migrations/202609240001_v32_accounts.sql`
- Create: `supabase/migrations/202609240002_v32_learning.sql`
- Create: `supabase/migrations/202609240003_v32_commerce.sql`
- Create: `supabase/migrations/202609240004_v32_organizations.sql`
- Create: `supabase/migrations/202609240005_v32_analytics_audit.sql`
- Create: `web/src/cloud/auth-client.js`

**Interfaces:**
- Produces DB tables/RLS for profiles, roles, competencies, shifts, organizations, memberships, plans, price versions, subscriptions, entitlements, analytics events, audit events.

- [ ] **Step 1: Write SQL migration assertions in a disposable test project/database**

Required invariants:
- learner cannot read another learner profile
- instructor can read only assigned/cohort learners
- org admin can read only own organization
- Admin cannot update Founder ownership row
- public client cannot update subscription/entitlement rows directly

- [ ] **Step 2: Apply migrations to the development Supabase project**

Use the Supabase connector/CLI only against the v3.2 development project, never production.

- [ ] **Step 3: Implement auth-client adapter**

Expose only `signUp`, `signIn`, `signOut`, `getSession`, `refreshSession`. Do not expose service-role credentials to browser code.

- [ ] **Step 4: Execute RLS tests with learner, instructor, admin and founder identities**

Expected: all forbidden cross-scope reads/writes are denied.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations web/src/cloud/auth-client.js
git commit -m "feat: add secure v3.2 account and data model"
```

### Task 14: Add pricing catalog, PayPal subscriptions and verified webhook state

**Files:**
- Create: `web/src/commerce/pricing-client.js`
- Create: `web/src/commerce/subscription-client.js`
- Create: `supabase/functions/paypal-webhook/index.ts`
- Create: `supabase/functions/entitlement/index.ts`
- Create: `supabase/functions/pricing-admin/index.ts`
- Test: `supabase/tests/paypal-webhook.test.ts`
- Test: `supabase/tests/admin-pricing.test.ts`

**Interfaces:**
- Produces: verified subscription state machine and versioned pricing catalog.

- [ ] **Step 1: Write webhook idempotency/out-of-order test**

```ts
Deno.test('duplicate and older PayPal events do not regress subscription state', async () => {
  const first = await applyEvent(activeEvent('evt-2', 200));
  const duplicate = await applyEvent(activeEvent('evt-2', 200));
  const older = await applyEvent(cancelledEvent('evt-1', 100));
  assertEquals(first.status, 'active');
  assertEquals(duplicate.applied, false);
  assertEquals(older.applied, false);
});
```

- [ ] **Step 2: Write pricing-approval test**

A 9% base-price change by Admin may publish; a 10% change or >25% discount creates `pending_founder_approval`.

- [ ] **Step 3: Implement webhook verification and state machine**

Only verified PayPal server events may create/update active paid entitlement. Store provider event ID and event timestamp for idempotency/ordering.

- [ ] **Step 4: Implement grandfathered price versions**

Subscription records retain `price_version_id`; new catalog versions do not mutate existing subscriptions automatically.

- [ ] **Step 5: Run server tests and commit**

```bash
deno test supabase/tests/paypal-webhook.test.ts supabase/tests/admin-pricing.test.ts
git add web/src/commerce supabase/functions supabase/tests
git commit -m "feat: add verified subscriptions and editable pricing"
```

### Task 15: Build Founder analytics and admin command center

**Files:**
- Create: `web/src/cloud/analytics-client.js`
- Create: `supabase/functions/analytics-ingest/index.ts`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Test: `web/tests/v32/ui-smoke.test.js`

**Interfaces:**
- Produces anonymized visitor funnel events and Founder/Admin dashboard views.

- [ ] **Step 1: Write analytics whitelist test**

Only approved event names/fields may be sent: page view, pricing view, demo start, account creation, checkout start, verified subscription, shift start/complete, unit usage. Reject payload keys matching patient names, MRN, DOB, free-text notes, or arbitrary clinical payloads.

- [ ] **Step 2: Implement anonymous session and acquisition attribution**

Persist anonymous ID locally; associate future events with account only after explicit sign-in/signup. Preserve original acquisition source.

- [ ] **Step 3: Implement Founder dashboard cards and subscriber table**

Views: visitors, demo users, checkout starts, new/active subscribers, cancellations, renewals, plan mix, most-used unit, funnel conversion.

- [ ] **Step 4: Implement Founder/Admin permission differences**

Admin may edit ordinary pricing; Founder-only approval panel handles major changes and ownership-level settings.

- [ ] **Step 5: Run UI/security smoke tests and commit**

```bash
cd web && node --test tests/v32/ui-smoke.test.js && npm test
git add web supabase/functions/analytics-ingest
git commit -m "feat: add founder analytics and admin command center"
```

### Task 16: Add instructors, cohorts, organizations and live observation

**Files:**
- Create: `web/src/cloud/realtime-client.js`
- Create: `supabase/functions/live-session/index.ts`
- Test: `supabase/tests/live-session.test.ts`
- Modify: `web/app.js`

**Interfaces:**
- Produces: `startObservedSession`, `publishTimelineEvent`, `subscribeToObservedSession`, `injectLabEvent`, `addInstructorNote`.

- [ ] **Step 1: Write disconnect/catch-up test**

```ts
Deno.test('learner continues when observer disconnects and instructor catches up from event cursor', async () => {
  const session = await createObservedSession();
  await publish(session, events(1, 10));
  disconnectInstructor(session);
  await publish(session, events(11, 25));
  const catchup = await reconnectInstructor(session, { afterSequence: 10 });
  assertEquals(catchup.map(e => e.sequence), range(11, 25));
});
```

- [ ] **Step 2: Implement learner-visible observation status**

UI must show `Instructor Observation Active` for the full observed period.

- [ ] **Step 3: Implement event-stream observation without remote learner control**

Instructor receives state/timeline updates and may add notes. Standard observed sessions cannot alter outcomes.

- [ ] **Step 4: Implement Simulation Lab event injection as a separate permission**

Injected events require instructor-lab capability and are recorded with `source: 'instructor-lab'`.

- [ ] **Step 5: Run tests and commit**

```bash
deno test supabase/tests/live-session.test.ts
cd web && npm test
git add web supabase/functions/live-session supabase/tests/live-session.test.ts
git commit -m "feat: add cohorts and transparent live observation"
```

### Task 17: Integrate v3.2 cockpit UI and free-demo paywall

**Files:**
- Create: `web/src/app/v32-controller.js`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Modify: `web/service-worker.js`
- Test: `web/tests/v32/ui-smoke.test.js`

**Interfaces:**
- Consumes: Living Hospital world, career, persistence, entitlement, cloud adapters.
- Produces: Home, Career Map, Living Hospital, Progress, Debriefs, Instructor, Founder/Admin routes with entitlement-aware navigation.

- [ ] **Step 1: Write smoke tests for demo vs Individual vs Instructor vs Founder navigation**

Demo sees one mission, one training shift, limited Med-Surg, sample debrief, career preview. Paid roles receive only their server-entitled features.

- [ ] **Step 2: Implement the four-zone cockpit**

Patient Strip, Clinical Workspace, Action Center, Shift Operations. Preserve existing v3.1 visual language rather than replacing it.

- [ ] **Step 3: Add career map, competency evidence and replay views**

Role unlocks must render from `evaluatePromotion()` results, never from XP alone.

- [ ] **Step 4: Update PWA cache/version strategy**

Do not activate a new service worker during an active simulation. Display an update-available prompt and activate after shift completion/reload.

- [ ] **Step 5: Run browser/static checks and commit**

```bash
cd web && npm test && npm run check && npm run check:site && npm run check:production
git add web
git commit -m "feat: integrate Living Hospital v3.2 experience"
```

### Task 18: Add preview deployment and end-to-end acceptance gate

**Files:**
- Create: `.github/workflows/v32-preview.yml`
- Create: `web/tests/v32/acceptance-living-hospital.test.js`
- Modify: `README.md`

**Interfaces:**
- Produces: non-production v3.2 preview artifact/site and a promotion gate.

- [ ] **Step 1: Write the acceptance chain as a deterministic fixture**

```js
test('connected hospital acceptance chain reconstructs correctly', () => {
  const result = runAcceptanceScenario('ed-surge-bed-pressure-001');
  assert.deepEqual(result.keyEvents, [
    'ED_SURGE','TELEMETRY_FULL','ICU_TRANSFER_WAITING','STAFF_CALLOFF',
    'PATIENT_DETERIORATION','DELEGATION_ACCEPTED','DISCHARGE_COMPLETE',
    'BED_OPEN','TRANSFER_COMPLETE'
  ]);
  assert.equal(result.debrief.complete, true);
});
```

- [ ] **Step 2: Run all client and server tests**

```bash
cd web && npm test && npm run check && npm run check:site && npm run check:production
cd .. && deno test supabase/tests/*.test.ts
```

Expected: all PASS.

- [ ] **Step 3: Build preview deployment workflow**

The workflow must deploy only from `v3.2-living-hospital` to a preview environment/artifact; it must not overwrite the current v3.1 Pages production site.

- [ ] **Step 4: Verify preview manually and with automated smoke checks**

Confirm demo flow, account flow, offline resume, all six units, promotion gates, subscription entitlement, Founder/Admin separation, and instructor observation indicator.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/v32-preview.yml web/tests/v32/acceptance-living-hospital.test.js README.md
git commit -m "test: gate v3.2 Living Hospital preview release"
```

### Task 19: Production promotion only after verification

**Files:**
- Modify only after all previous tasks pass: production deployment workflow/release artifact.

**Interfaces:**
- Consumes: verified preview release.
- Produces: CareSyncD v3.2 production deployment with rollback reference to v3.1.

- [ ] **Step 1: Record verified v3.1 rollback SHA and v3.2 candidate SHA**

```bash
git rev-parse v3.2-living-hospital
git rev-parse gh-pages
```

- [ ] **Step 2: Run the complete verification suite one final time**

```bash
cd web && npm test && npm run check && npm run check:site && npm run check:production
cd .. && deno test supabase/tests/*.test.ts
```

- [ ] **Step 3: Verify no secrets are present in committed/public frontend assets**

Run repository production checker plus explicit scans for PayPal secrets, Supabase service-role keys, private admin tokens, localhost/tunnel URLs, and `.env` contents.

- [ ] **Step 4: Promote the verified static build and verify the live URL**

Verify index, manifest, service worker, core JS, subscription/demo routing, and a safe unauthenticated landing request.

- [ ] **Step 5: Tag the release and retain rollback instructions**

```bash
git tag v3.2.0-living-hospital <verified-candidate-sha>
git push origin v3.2.0-living-hospital
```

Do not claim production completion until the live URL and deployed workflow both pass verification.
