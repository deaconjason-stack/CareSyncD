# CareSyncD v3.2 Phase 1 — Living Hospital Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materialize the verified v3.1 source and add a deterministic Living Hospital Core that advances time, patient trajectories, staffing, delegation, census, transfers, events, and consequences without changing the live v3.1 production site.

**Architecture:** v3.1 is copied into a normal `web/` source tree on the v3.2 branch. New modules under `web/src/living-hospital/` are pure deterministic domain functions driven by injected RNG and immutable-ish state copies. Phase 1 contains no cloud, billing, auth, or live-observation code; those are separate phases after the core is stable.

**Tech Stack:** JavaScript ES modules, Node.js 22, existing CareSyncD test/check scripts, Node built-in `node:test`, IndexedDB/PWA only as preserved v3.1 baseline in this phase.

**Spec:** `docs/superpowers/specs/2026-09-24-caresyncd-v3.2-living-hospital-design.md`

## Global Constraints

- v3.1 production remains untouched.
- Simulation is educational only; no real-patient diagnosis, monitoring, treatment, or clinical decision support.
- No PHI.
- World evolution must be deterministic for a fixed seed, initial state, and learner action sequence.
- Domain engines never call `Math.random()` directly.
- Every clinical change must come from authored trajectory/rule data.
- Guided, Standard, and Challenge difficulty semantics remain distinct.
- RN/LPN scope rules are configuration-driven, never hard-coded as a universal jurisdiction rule.

## Review Focus

1. **Determinism:** same seed + state + actions must produce byte-equivalent timeline/world snapshots.
2. **Tick order:** patient trajectories must not run after consequence resolution or create order-dependent drift.
3. **Delegation realism:** delegated work must queue and complete later; no instant completion.
4. **Transfer blockers:** transfers must wait for bed, staffing, handoff, and transport readiness.
5. **Pressure control:** Guided mode must refuse event combinations that exceed its pressure budget.

---

### Task 1: Materialize the verified v3.1 source

**Files:**
- Create: `web/**` from verified v3.1 archive
- Create: `.github/workflows/v32-ci.yml`

**Interfaces:**
- Consumes: existing release chunks on `v3.2-living-hospital` inherited from `main`.
- Produces: verified source tree under `web/` with unchanged v3.1 behavior.

- [ ] **Step 1: Reconstruct and verify the v3.1 archive**

```bash
cat release/parts/part00.b64 release/parts/part01.b64 release/parts/part02.b64 release/parts/part03.b64 release/tail/tail00.b64 release/tail/tail01.b64 release/tail/tail02.b64 > /tmp/caresyncd-v31.b64
base64 --decode /tmp/caresyncd-v31.b64 > /tmp/CareSyncD-Permanent-v3.1.0.zip
echo '0e8e2bd52b89cde3b31a29de11014b27c739f7ef9d62c4ce2a8c2f8fba03de07  /tmp/CareSyncD-Permanent-v3.1.0.zip' | sha256sum --check
```

Expected: `OK`.

- [ ] **Step 2: Extract and run every preserved check**

```bash
rm -rf web && mkdir web
unzip -q /tmp/CareSyncD-Permanent-v3.1.0.zip -d web
cd web
npm test
npm run check
npm run check:site
npm run check:production
```

Expected: all PASS before v3.2 code exists.

- [ ] **Step 3: Add branch-only CI**

Create `.github/workflows/v32-ci.yml`:

```yaml
name: CareSyncD v3.2 CI
on:
  push:
    branches: [v3.2-living-hospital]
  pull_request:
    branches: [v3.2-living-hospital]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: '22'
          package-manager-cache: false
      - working-directory: web
        run: npm test
      - working-directory: web
        run: npm run check
      - working-directory: web
        run: npm run check:site
      - working-directory: web
        run: npm run check:production
```

- [ ] **Step 4: Re-run locally**

```bash
cd web && npm test && npm run check && npm run check:site && npm run check:production
```

- [ ] **Step 5: Commit**

```bash
git add web .github/workflows/v32-ci.yml
git commit -m "build: materialize verified v3.1 source for v3.2"
```

### Task 2: Define world state, seeded RNG, and test fixtures

**Files:**
- Create: `web/src/living-hospital/world-state.js`
- Create: `web/src/living-hospital/seeded-rng.js`
- Create: `web/src/living-hospital/scope-policy.js`
- Create: `web/tests/v32/helpers.js`
- Create: `web/tests/v32/world-state.test.js`

**Interfaces:**
- Produces: `createWorldState(config)`, `validateWorldState(state)`, `createSeededRng(seed)`, `createScopePolicy(profile)`.
- Test helper exports: `baseWorld`, `patientFixture`, `staffFixture`, `blockedTransferWorld`, `guidedPressureWorld`.

- [ ] **Step 1: Write failing world-state test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldState, validateWorldState } from '../../src/living-hospital/world-state.js';

test('creates schema 32 Living Hospital state', () => {
  const s = createWorldState({ seed: 42, difficulty: 'guided', shiftFormat: 'training' });
  assert.equal(validateWorldState(s), true);
  assert.equal(s.schemaVersion, 32);
  assert.deepEqual(Object.keys(s.competencies), ['clinicalJudgment','operations','communication','leadership']);
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd web && node --test tests/v32/world-state.test.js
```

Expected: module-not-found FAIL.

- [ ] **Step 3: Implement state factory and deterministic RNG**

`world-state.js`:

```js
export function createWorldState({ seed, difficulty, shiftFormat }) {
  return {
    schemaVersion: 32,
    seed,
    difficulty,
    shiftFormat,
    clock: { minute: 0, running: false },
    units: {}, patients: {}, staff: {}, tasks: {}, transfers: {},
    events: [], timeline: [], pressure: { used: 0 },
    competencies: { clinicalJudgment: 0, operations: 0, communication: 0, leadership: 0 }
  };
}
export function validateWorldState(s) {
  return s?.schemaVersion === 32 && Number.isInteger(s.seed) && ['guided','standard','challenge'].includes(s.difficulty);
}
```

`seeded-rng.js` exports a pure deterministic generator:

```js
export function createSeededRng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 0x100000000;
  };
}
```

`scope-policy.js` exports `canPerform(actionId)` and `canDelegate(actionId, targetRole)` based only on supplied rules.

- [ ] **Step 4: Add concrete reusable fixtures**

`web/tests/v32/helpers.js`:

```js
import { createWorldState } from '../../src/living-hospital/world-state.js';
export const baseWorld = (overrides = {}) => Object.assign(createWorldState({ seed: 7, difficulty: 'standard', shiftFormat: 'career' }), overrides);
export const patientFixture = (id = 'p1') => ({ id, unitId: 'med-surg', trajectory: { state: 'stable', branch: 'baseline' }, pending: [] });
export const staffFixture = (id = 'cna-1') => ({ id, role: 'cna', available: true, workload: 0, queue: [] });
export const blockedTransferWorld = () => ({ ...baseWorld(), patients: { p1: patientFixture() }, transfers: {}, units: { icu: { openBeds: 0, staffReady: false } } });
export const guidedPressureWorld = () => ({ ...baseWorld({ difficulty: 'guided' }), pressure: { used: 3, limit: 3 } });
```

- [ ] **Step 5: Run tests and commit**

```bash
cd web && node --test tests/v32/world-state.test.js
git add web/src/living-hospital web/tests/v32
git commit -m "feat: define Living Hospital world contracts"
```

### Task 3: Implement hospital clock and deterministic tick orchestration

**Files:**
- Create: `web/src/living-hospital/hospital-clock.js`
- Create: `web/src/living-hospital/hospital-world.js`
- Create: `web/tests/v32/deterministic-world.test.js`

**Interfaces:**
- Produces: `advanceClock(state, minutes)`, `createHospitalWorld({ state, rng, engines })`, `world.tick(actions)`.

- [ ] **Step 1: Write deterministic order test with inline stub engines**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHospitalWorld } from '../../src/living-hospital/hospital-world.js';
import { createSeededRng } from '../../src/living-hospital/seeded-rng.js';
import { baseWorld } from './helpers.js';

const tagged = tag => ({ advance: s => ({ ...s, timeline: [...s.timeline, tag] }) });

test('tick order is clock -> trajectories -> operations -> events -> consequences -> timeline', () => {
  const engines = {
    clock: tagged('clock'), trajectories: tagged('trajectories'), operations: tagged('operations'),
    events: tagged('events'), consequences: tagged('consequences'), timeline: tagged('timeline')
  };
  const world = createHospitalWorld({ state: baseWorld(), rng: createSeededRng(7), engines });
  const out = world.tick([]);
  assert.deepEqual(out.timeline, ['clock','trajectories','operations','events','consequences','timeline']);
});

test('same seed and same actions produce identical state', () => {
  const run = () => {
    const world = createHospitalWorld.withDefaultEngines({ state: baseWorld(), rng: createSeededRng(99) });
    let out;
    for (let i = 0; i < 60; i++) out = world.tick(i === 5 ? [{ type: 'ASSESS', patientId: 'p1' }] : []);
    return out;
  };
  assert.deepEqual(run(), run());
});
```

- [ ] **Step 2: Run and verify failure**

```bash
cd web && node --test tests/v32/deterministic-world.test.js
```

- [ ] **Step 3: Implement clock and tick pipeline**

`advanceClock` clones the clock and adds minutes. `createHospitalWorld` stores current state internally, applies engines in the specified order, then returns the new state. `withDefaultEngines` wires no-op placeholders only until Tasks 4–7 replace them; the no-op engines still record deterministic tick metadata.

- [ ] **Step 4: Run test twice plus preserved tests**

```bash
cd web && node --test tests/v32/deterministic-world.test.js && node --test tests/v32/deterministic-world.test.js && npm test
```

Expected: identical PASS output both runs.

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/hospital-clock.js web/src/living-hospital/hospital-world.js web/tests/v32/deterministic-world.test.js
git commit -m "feat: add deterministic hospital world loop"
```

### Task 4: Implement patient trajectories and consequence memory

**Files:**
- Create: `web/src/living-hospital/trajectory-engine.js`
- Create: `web/src/living-hospital/consequence-engine.js`
- Create: `web/tests/v32/trajectories.test.js`

**Interfaces:**
- Produces: `advanceTrajectories(state, rng)`, `recordDecision(state, decision)`, `resolveConsequences(state)`.

- [ ] **Step 1: Write authored-branch test without undefined helpers**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { baseWorld, patientFixture } from './helpers.js';
import { recordDecision, advanceTrajectories } from '../../src/living-hospital/trajectory-engine.js';

const authored = {
  initial: 'watching',
  states: {
    watching: { reassessByMinute: 20, onTime: 'improving', late: 'delayed-recognition' },
    improving: {},
    'delayed-recognition': {}
  }
};

test('late reassessment enters delayed-recognition branch and records evidence', () => {
  let s = baseWorld({ clock: { minute: 25, running: true }, patients: { p1: { ...patientFixture(), trajectory: { definition: authored, state: 'watching', branch: 'baseline' } } } });
  s = recordDecision(s, { type: 'REASSESS', patientId: 'p1', minute: 25 });
  s = advanceTrajectories(s, () => 0.5);
  assert.equal(s.patients.p1.trajectory.state, 'delayed-recognition');
  assert.ok(s.timeline.some(e => e.kind === 'MISSED_WINDOW'));
});
```

- [ ] **Step 2: Run and verify failure**

```bash
cd web && node --test tests/v32/trajectories.test.js
```

- [ ] **Step 3: Implement authored transition evaluation**

Transitions are explicit data with guard fields; no free-form model output determines clinical state. `resolveConsequences` consumes consequence records once and attaches `sourceDecisionId` / `downstreamEventId` links for later debrief.

- [ ] **Step 4: Add tests for improving and critical pathways; run**

```bash
cd web && node --test tests/v32/trajectories.test.js
```

Expected: PASS for on-time, delayed, and critical branches.

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/trajectory-engine.js web/src/living-hospital/consequence-engine.js web/tests/v32/trajectories.test.js
git commit -m "feat: add authored trajectories and consequence memory"
```

### Task 5: Implement staffing and realistic delegation

**Files:**
- Create: `web/src/living-hospital/staffing-engine.js`
- Create: `web/src/living-hospital/delegation-engine.js`
- Create: `web/tests/v32/staffing-delegation.test.js`

**Interfaces:**
- Produces: `setStaffAvailability`, `delegateTask`, `advanceDelegatedTasks`.

- [ ] **Step 1: Write queue-not-instant test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { baseWorld, staffFixture } from './helpers.js';
import { delegateTask } from '../../src/living-hospital/delegation-engine.js';

const scope = { canDelegate: () => true };
test('delegation queues work instead of completing immediately', () => {
  const s = baseWorld({ staff: { 'cna-1': staffFixture() }, tasks: { t1: { id: 't1', actionId: 'vitals', status: 'open' } } });
  const out = delegateTask(s, { taskId: 't1', staffId: 'cna-1', scopePolicy: scope });
  assert.equal(out.tasks.t1.status, 'delegated');
  assert.deepEqual(out.staff['cna-1'].queue, ['t1']);
});
```

- [ ] **Step 2: Run and verify failure**

```bash
cd web && node --test tests/v32/staffing-delegation.test.js
```

- [ ] **Step 3: Implement queue progression and scope rejection**

A task may transition `open -> delegated -> in_progress -> complete` across ticks. Out-of-scope delegation remains `open` and emits `DELEGATION_REJECTED_SCOPE` evidence.

- [ ] **Step 4: Add delayed/unavailable/overloaded tests and run**

```bash
cd web && node --test tests/v32/staffing-delegation.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/staffing-engine.js web/src/living-hospital/delegation-engine.js web/tests/v32/staffing-delegation.test.js
git commit -m "feat: add staffing and delegation queues"
```

### Task 6: Implement census, beds, admissions, transfers, and discharges

**Files:**
- Create: `web/src/living-hospital/census-engine.js`
- Create: `web/src/living-hospital/transfer-engine.js`
- Create: `web/tests/v32/census-transfer.test.js`

**Interfaces:**
- Produces: `requestAdmission`, `requestTransfer`, `markDischargeReady`, `advanceBedFlow`.

- [ ] **Step 1: Write explicit transfer-blocker test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { blockedTransferWorld } from './helpers.js';
import { requestTransfer } from '../../src/living-hospital/transfer-engine.js';

test('transfer waits for bed, staffing, handoff, and transport', () => {
  const out = requestTransfer(blockedTransferWorld(), {
    patientId: 'p1', toUnit: 'icu', handoffReady: false, transportReady: false
  });
  assert.equal(out.transfers.p1.status, 'waiting');
  assert.deepEqual(out.transfers.p1.blockers.sort(), ['bed','handoff','staffing','transport']);
});
```

- [ ] **Step 2: Run and verify failure**

```bash
cd web && node --test tests/v32/census-transfer.test.js
```

- [ ] **Step 3: Implement bed-flow state machine**

Completed discharges increment destination capacity only after discharge completion. Waiting transfers are reconsidered on the next operations tick, not synchronously inside the discharge call.

- [ ] **Step 4: Test discharge -> bed open -> transfer complete sequence**

```bash
cd web && node --test tests/v32/census-transfer.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/census-engine.js web/src/living-hospital/transfer-engine.js web/tests/v32/census-transfer.test.js
git commit -m "feat: add connected hospital bed flow"
```

### Task 7: Implement contextual events and pressure budgets

**Files:**
- Create: `web/src/living-hospital/event-engine.js`
- Create: `web/src/living-hospital/pressure-budget.js`
- Create: `web/tests/v32/events-pressure.test.js`

**Interfaces:**
- Produces: `eventEligible(state, event)`, `scheduleEvent(state, event)`, `consumePressure(state, cost)`.

- [ ] **Step 1: Write Guided budget rejection test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { guidedPressureWorld } from './helpers.js';
import { scheduleEvent } from '../../src/living-hospital/event-engine.js';

test('Guided rejects an event that exceeds pressure budget', () => {
  const out = scheduleEvent(guidedPressureWorld(), {
    id: 'surge-1', level: 'hospital', pressureCost: 2, prerequisites: []
  });
  assert.equal(out.accepted, false);
  assert.equal(out.reason, 'pressure-budget');
});
```

- [ ] **Step 2: Run and verify failure**

```bash
cd web && node --test tests/v32/events-pressure.test.js
```

- [ ] **Step 3: Implement contextual eligibility**

Every event must declare `{ id, level, pressureCost, prerequisites, cooldownKey }`. `scheduleEvent` checks prerequisites, cooldown, and difficulty budget before enqueueing.

- [ ] **Step 4: Test Standard/Challenge overlap plus nonsensical prerequisite rejection**

```bash
cd web && node --test tests/v32/events-pressure.test.js
```

- [ ] **Step 5: Commit and run Phase 1 gate**

```bash
git add web/src/living-hospital/event-engine.js web/src/living-hospital/pressure-budget.js web/tests/v32/events-pressure.test.js
git commit -m "feat: add contextual hospital pressure engine"
cd web
node --test tests/v32/*.test.js
npm test
npm run check
npm run check:site
npm run check:production
```

Expected: all v3.2 Phase 1 tests and all preserved v3.1 checks PASS.

## Phase 1 Completion Gate

Phase 1 is complete only when:
- v3.1 source checksum and preserved tests pass;
- deterministic world tests pass repeatedly;
- authored trajectories preserve evidence links;
- delegation is queued and scope-aware;
- transfers honor all four blockers;
- pressure budgets behave differently by difficulty;
- no production deployment workflow or live v3.1 asset has been changed.
