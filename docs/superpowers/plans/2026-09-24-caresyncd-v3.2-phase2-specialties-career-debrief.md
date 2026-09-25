# CareSyncD v3.2 Phase 2 — Specialties, Career, Competency, Debrief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six specialty unit definitions, configuration-driven RN/LPN scope profiles, competency-gated career progression, and deterministic evidence-based debrief/replay on top of the Phase 1 Living Hospital Core.

**Architecture:** Phase 2 stays domain-only under `web/src/living-hospital/`; no UI, billing, auth, cloud, or production deployment changes. Specialty definitions are authored data validated by structural safety contracts. Career unlocks consume competency evidence and performance summaries; XP is stored only as motivational progress and never grants responsibility by itself. Debrief and replay consume the recorded timeline and never rerun simulation randomness.

**Tech Stack:** JavaScript ES modules, Node.js 22, Node built-in `node:test`, existing CareSyncD v3.1/v3.2 CI.

**Spec:** `docs/superpowers/specs/2026-09-24-caresyncd-v3.2-living-hospital-design.md`

## Global Constraints

- v3.1 production remains untouched.
- Educational simulation only; no real-patient diagnosis, monitoring, treatment, or clinical decision support.
- No PHI.
- Initial units are exactly: Med-Surg, Emergency Department, Telemetry/Step-Down, ICU, Pediatrics, OB.
- Pediatrics must explicitly require age-adjusted assessment and medication-weight verification concepts; no dosing values are authored in Phase 2.
- OB must remain conceptual/educational and avoid medication-dose or patient-specific treatment claims in Phase 2.
- RN/LPN/LVN scope rules are supplied by jurisdiction/facility configuration; no universal role assumptions.
- Responsibility unlocks require both performance thresholds and competency gates.
- Four competency domains are exactly: `clinicalJudgment`, `operations`, `communication`, `leadership`.
- XP cannot satisfy a competency gate.
- Replay is generated only from recorded history; it never calls RNG or re-simulates the shift.

## Review Focus

1. **Career bypass:** very high XP must not unlock a role when a required competency is below threshold.
2. **Scope variability:** the same role/action can be permitted in one facility profile and denied in another.
3. **Specialty safety:** Pediatrics and OB definitions must carry explicit specialty safety metadata and must not contain medication doses.
4. **Evidence provenance:** every competency credit must point to a timeline/event source and minute.
5. **Replay determinism:** replaying the same recorded timeline twice must be byte-equivalent and must not invoke randomness.

---

### Task 1: Define and validate the six specialty units

**Files:**
- Create: `web/src/living-hospital/units/unit-contract.js`
- Create: `web/src/living-hospital/units/med-surg.js`
- Create: `web/src/living-hospital/units/emergency.js`
- Create: `web/src/living-hospital/units/telemetry.js`
- Create: `web/src/living-hospital/units/icu.js`
- Create: `web/src/living-hospital/units/pediatrics.js`
- Create: `web/src/living-hospital/units/ob.js`
- Create: `web/src/living-hospital/unit-catalog.js`
- Create: `web/tests/v32/unit-catalog.test.js`

**Interfaces:**
- Produces: `validateUnitDefinition(unit)`, `UNIT_CATALOG`, `getUnitDefinition(id)`, `listUnitDefinitions()`.
- Unit IDs: `med-surg`, `ed`, `telemetry`, `icu`, `pediatrics`, `ob`.

- [ ] **Step 1: Write the failing catalog test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_CATALOG, getUnitDefinition } from '../../src/living-hospital/unit-catalog.js';
import { validateUnitDefinition } from '../../src/living-hospital/units/unit-contract.js';

test('catalog contains exactly the six approved v3.2 units', () => {
  assert.deepEqual(Object.keys(UNIT_CATALOG).sort(), ['ed','icu','med-surg','ob','pediatrics','telemetry']);
  for (const unit of Object.values(UNIT_CATALOG)) assert.equal(validateUnitDefinition(unit), true);
});

test('Pediatrics and OB carry explicit specialty safety metadata', () => {
  const peds = getUnitDefinition('pediatrics');
  const ob = getUnitDefinition('ob');
  assert.equal(peds.safety.ageAdjustedAssessmentRequired, true);
  assert.equal(peds.safety.weightVerificationRequiredForMedicationConcepts, true);
  assert.equal(ob.safety.specialtyEscalationRequired, true);
  assert.equal(JSON.stringify([peds, ob]).match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|mL)\b/gi), null);
});
```

- [ ] **Step 2: Run it and confirm module-not-found RED**

```bash
cd web && node --test tests/v32/unit-catalog.test.js
```

- [ ] **Step 3: Implement the unit contract and six authored definitions**

Each unit exports one frozen object with this exact shape:

```js
{
  id, title, population, environment,
  learningFocus: [],
  staffingRoles: [],
  caseTemplates: [{ id, title, scenarioId, learningObjectives: [], expectedActionIds: [] }],
  safety: { educationalOnly: true, specialtyEscalationRequired: true, ...specialtyFlags }
}
```

Use existing v3.1 scenario IDs where they fit. Add conceptual Phase-2-only template IDs for Pediatrics and OB; do not add medication doses or real-patient data.

- [ ] **Step 4: Add catalog lookups and run the test**

```bash
cd web && node --test tests/v32/unit-catalog.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/units web/src/living-hospital/unit-catalog.js web/tests/v32/unit-catalog.test.js
git commit -m "feat: add six Living Hospital specialty units"
```

### Task 2: Add facility-configurable RN/LPN/LVN scope profiles

**Files:**
- Create: `web/src/living-hospital/scope-profile.js`
- Modify: `web/src/living-hospital/scope-policy.js`
- Create: `web/tests/v32/scope-profile.test.js`

**Interfaces:**
- Produces: `createScopeProfile(config)`, `policyForRole(profile, roleId)`.
- Reuses: `createScopePolicy({ perform, delegate })`.

- [ ] **Step 1: Write the failing variability test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createScopeProfile, policyForRole } from '../../src/living-hospital/scope-profile.js';

test('the same LPN action may differ between facility profiles', () => {
  const a = createScopeProfile({ id:'a', jurisdiction:'configured-a', facility:'A', roles:{ lpn:{ perform:['assess'], delegate:{} } } });
  const b = createScopeProfile({ id:'b', jurisdiction:'configured-b', facility:'B', roles:{ lpn:{ perform:['assess','iv_access'], delegate:{} } } });
  assert.equal(policyForRole(a,'lpn').canPerform('iv_access'), false);
  assert.equal(policyForRole(b,'lpn').canPerform('iv_access'), true);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
cd web && node --test tests/v32/scope-profile.test.js
```

- [ ] **Step 3: Implement immutable profile normalization**

`createScopeProfile` requires explicit `id`, `jurisdiction`, `facility`, and `roles`. It clones role arrays/maps and never supplies hidden RN/LPN defaults. `policyForRole` throws for unknown roles and delegates to `createScopePolicy`.

- [ ] **Step 4: Add delegation-difference and mutation-isolation tests; run**

```bash
cd web && node --test tests/v32/scope-profile.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/scope-profile.js web/src/living-hospital/scope-policy.js web/tests/v32/scope-profile.test.js
git commit -m "feat: add configurable nursing scope profiles"
```

### Task 3: Build four-domain competency evidence

**Files:**
- Create: `web/src/living-hospital/competency-engine.js`
- Create: `web/tests/v32/competency-engine.test.js`

**Interfaces:**
- Produces: `createCompetencyLedger()`, `recordCompetencyEvidence(ledger, evidence)`, `summarizeCompetencies(ledger)`, `meetsCompetencyRequirements(summary, requirements)`.

- [ ] **Step 1: Write failing provenance and domain tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompetencyLedger, recordCompetencyEvidence, summarizeCompetencies } from '../../src/living-hospital/competency-engine.js';

test('evidence requires one approved domain, source event, and minute', () => {
  let ledger = createCompetencyLedger();
  ledger = recordCompetencyEvidence(ledger, { domain:'communication', sourceEventId:'evt-12', minute:42, outcome:'met', weight:1 });
  const summary = summarizeCompetencies(ledger);
  assert.equal(summary.communication.met, 1);
  assert.equal(ledger.evidence[0].sourceEventId, 'evt-12');
});
```

- [ ] **Step 2: Run and verify RED**

```bash
cd web && node --test tests/v32/competency-engine.test.js
```

- [ ] **Step 3: Implement deterministic evidence records**

Accepted outcomes are `met`, `partial`, `missed`. Approved domains are exactly the four global domains. Evidence IDs are sequential `competency-evidence-N`. Missing/invalid provenance throws instead of awarding credit.

- [ ] **Step 4: Add tests for invalid domain, missing source, partial/missed weighting, and requirement checks**

```bash
cd web && node --test tests/v32/competency-engine.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/competency-engine.js web/tests/v32/competency-engine.test.js
git commit -m "feat: add competency evidence ledger"
```

### Task 4: Implement specialty and leadership career trees with hard competency gates

**Files:**
- Create: `web/src/living-hospital/career-trees.js`
- Create: `web/src/living-hospital/progression-engine.js`
- Create: `web/tests/v32/career-progression.test.js`

**Interfaces:**
- Produces: `CAREER_TREES`, `getCareerNode(id)`, `evaluateCareerUnlock({ nodeId, completedNodeIds, performance, competencySummary, xp })`.

- [ ] **Step 1: Write the failing XP-bypass regression test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCareerUnlock } from '../../src/living-hospital/progression-engine.js';

test('XP alone cannot unlock Charge Nurse', () => {
  const result = evaluateCareerUnlock({
    nodeId:'leadership-charge',
    completedNodeIds:['leadership-lead'],
    performance:{ overall:95 },
    competencySummary:{ clinicalJudgment:{score:95}, operations:{score:95}, communication:{score:95}, leadership:{score:40} },
    xp:999999
  });
  assert.equal(result.unlocked, false);
  assert.ok(result.blockers.includes('competency:leadership'));
});
```

- [ ] **Step 2: Run and verify RED**

```bash
cd web && node --test tests/v32/career-progression.test.js
```

- [ ] **Step 3: Author career trees**

Create specialty nodes for all six starting units and advancement/cross-training nodes, plus leadership nodes:

```text
leadership-bedside -> leadership-lead -> leadership-charge -> leadership-house-supervisor -> leadership-clinical-leader
```

Every non-start node declares `prerequisites`, `minPerformance`, and per-domain `competencyMinimums`. XP is returned for display but is never consulted by `evaluateCareerUnlock`.

- [ ] **Step 4: Add tests for starting-unit choice, cross-training prerequisites, successful promotion, and high-XP failure**

```bash
cd web && node --test tests/v32/career-progression.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/career-trees.js web/src/living-hospital/progression-engine.js web/tests/v32/career-progression.test.js
git commit -m "feat: add competency-gated career progression"
```

### Task 5: Build evidence-based debrief and deterministic shift replay

**Files:**
- Create: `web/src/living-hospital/debrief-engine.js`
- Create: `web/src/living-hospital/shift-replay.js`
- Create: `web/tests/v32/debrief-replay.test.js`

**Interfaces:**
- Produces: `buildDebrief({ timeline, competencyLedger, shiftSummary })`, `buildReplayFrames(timeline)`, `frameAtMinute(frames, minute)`.

- [ ] **Step 1: Write failing replay-without-randomness test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReplayFrames } from '../../src/living-hospital/shift-replay.js';

test('replay is reconstructed only from recorded timeline history', () => {
  const timeline = [
    {kind:'DECISION', minute:10, decisionId:'d1'},
    {kind:'MISSED_WINDOW', minute:18, patientId:'p1'},
    {kind:'CONSEQUENCE_RESOLVED', minute:20, downstreamEventId:'event-1'}
  ];
  assert.deepEqual(buildReplayFrames(timeline), buildReplayFrames(timeline));
});
```

- [ ] **Step 2: Run and verify RED**

```bash
cd web && node --test tests/v32/debrief-replay.test.js
```

- [ ] **Step 3: Implement replay and debrief projection**

`buildReplayFrames` preserves original event order with a stable `sequence` index and groups views by minute without importing RNG/simulation engines. `buildDebrief` emits `timeline`, `competencies`, `strengths`, `opportunities`, `criticalEvents`, and `summary`. It references recorded evidence IDs instead of inventing new clinical events.

- [ ] **Step 4: Add tests for same-minute order, competency evidence inclusion, and source-link preservation**

```bash
cd web && node --test tests/v32/debrief-replay.test.js
```

- [ ] **Step 5: Commit**

```bash
git add web/src/living-hospital/debrief-engine.js web/src/living-hospital/shift-replay.js web/tests/v32/debrief-replay.test.js
git commit -m "feat: add evidence debrief and shift replay"
```

### Task 6: Phase 2 integration and content gate

**Files:**
- Create: `web/tests/v32/phase2-integration.test.js`
- Modify only if the integration test exposes a defect: the Phase 2 modules above.

**Interfaces:**
- Consumes all Phase 1 + Phase 2 public interfaces.
- Produces the Phase 2 acceptance gate only; no production deployment.

- [ ] **Step 1: Write an end-to-end domain acceptance test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { listUnitDefinitions } from '../../src/living-hospital/unit-catalog.js';
import { createCompetencyLedger, recordCompetencyEvidence, summarizeCompetencies } from '../../src/living-hospital/competency-engine.js';
import { evaluateCareerUnlock } from '../../src/living-hospital/progression-engine.js';
import { buildDebrief } from '../../src/living-hospital/debrief-engine.js';
import { buildReplayFrames } from '../../src/living-hospital/shift-replay.js';

test('six units feed evidence, competency-gated progression, debrief, and replay', () => {
  assert.equal(listUnitDefinitions().length, 6);
  let ledger = createCompetencyLedger();
  for (const [i, domain] of ['clinicalJudgment','operations','communication','leadership'].entries()) {
    ledger = recordCompetencyEvidence(ledger, { domain, sourceEventId:`evt-${i+1}`, minute:10+i, outcome:'met', weight:100 });
  }
  const competencySummary = summarizeCompetencies(ledger);
  const promotion = evaluateCareerUnlock({ nodeId:'leadership-charge', completedNodeIds:['leadership-lead'], performance:{overall:90}, competencySummary, xp:0 });
  assert.equal(promotion.unlocked, true);
  const timeline = ledger.evidence.map(e => ({ kind:'COMPETENCY_EVIDENCE', minute:e.minute, evidenceId:e.id, sourceEventId:e.sourceEventId }));
  const debrief = buildDebrief({ timeline, competencyLedger:ledger, shiftSummary:{score:90} });
  assert.equal(debrief.competencies.evidenceCount, 4);
  assert.deepEqual(buildReplayFrames(timeline), buildReplayFrames(debrief.timeline));
});
```

- [ ] **Step 2: Run integration test and fix only demonstrated failures**

```bash
cd web && node --test tests/v32/phase2-integration.test.js
```

- [ ] **Step 3: Run the complete Phase 1 + Phase 2 v3.2 suite twice**

```bash
cd web
node --test tests/v32/*.test.js
node --test tests/v32/*.test.js
```

Expected: identical pass counts, zero failures.

- [ ] **Step 4: Run preserved v3.1 checks**

```bash
npm test
npm run check
npm run check:site
npm run check:production
```

Expected: all PASS in GitHub Actions on the same branch commit.

- [ ] **Step 5: Commit**

```bash
git add web/tests/v32/phase2-integration.test.js web/src/living-hospital
git commit -m "test: close v3.2 phase 2 specialty career gate"
```

## Phase 2 Completion Gate

Phase 2 is complete only when:
- exactly six approved unit definitions validate;
- Pediatrics/OB specialty safety metadata tests pass and no medication-dose strings are authored in those unit definitions;
- scope differences are driven exclusively by supplied profile configuration;
- all four competency domains retain event/minute provenance;
- high XP cannot bypass any missing competency gate;
- specialty/leadership promotion requires prerequisites + performance + competency minimums;
- debrief and replay are projections of recorded history, not rerun randomness;
- all v3.2 tests and every preserved v3.1 check pass in GitHub Actions;
- `main`, `gh-pages`, and production deployment remain unchanged.
