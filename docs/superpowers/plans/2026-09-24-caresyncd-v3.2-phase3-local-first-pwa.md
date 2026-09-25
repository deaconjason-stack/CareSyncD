# CareSyncD v3.2 Phase 3 — Local-First Profiles, Offline Persistence, PWA UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the verified v3.2 Living Hospital branch to schema-v32 local-first persistence with autosave/resume, safe backup migration, deterministic merge semantics, career/competency presentation models, and service-worker update safety while preserving the current v3.1 production deployment.

**Architecture:** Extend the existing persistence adapters instead of replacing them. Schema migration is pure and versioned; autosave is a coordinator above adapters; cloud merge is a pure record-selection function with explicit active-run conflicts. UI work in this phase is presentation-model first so it is testable without adding a browser framework. The existing PWA shell remains the host and service-worker activation remains deferred during active simulation.

**Tech Stack:** Browser-native ES modules, IndexedDB, service workers, Node 22 built-in test runner, existing dependency-free CareSyncD code.

**Spec:** `docs/superpowers/specs/2026-09-24-caresyncd-v3.2-living-hospital-design.md`

## Global Constraints

- `SCHEMA_VERSION` becomes exactly `32` for v3.2 records.
- Existing schema-v1 learner/run backups must migrate without silent data loss.
- Corrupt/unsupported imports fail before replacing existing data.
- Active-run autosave never mutates caller-owned state.
- Local and cloud histories merge additively; two divergent active runs produce an explicit conflict instead of blind overwrite.
- Service-worker updates must not replace the app while an active simulation is running.
- No PHI collection or real-patient fields are introduced.
- Production `main`/`gh-pages` remain untouched in Phase 3.

## Review Focus

1. Schema-v1 backups containing valid learner/run records must migrate to v32 and retain IDs, progress, state, and timestamps.
2. Malformed imports and unknown schema versions must leave the prior adapter state byte-equivalent.
3. Simultaneous local/cloud completed history should deduplicate by stable ID, but divergent active runs must report conflict rather than choose arbitrarily.
4. Autosave after a caller mutates its original object must retain the snapshot taken at save time, not a later mutation.
5. A waiting service worker must not activate while an active run exists; it may activate only after the run is cleared or the user explicitly applies it outside a run.

---

### Task 1: Schema v32 records and v1 migration

**Files:**
- Modify: `web/src/domain/schema.js`
- Modify: `web/src/persistence/migrations.js`
- Test: `web/tests/v32/schema-migration.test.js`

**Interfaces:**
- Produces: `SCHEMA_VERSION = 32`
- Produces: `migrateRecord(record) -> cloned v32 record`
- Consumes: existing learner/run schema-v1 shapes.

- [ ] **Step 1: Write failing migration tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION } from '../../src/domain/schema.js';
import { migrateRecord } from '../../src/persistence/migrations.js';

test('schema version is 32', () => assert.equal(SCHEMA_VERSION, 32));
test('v1 learner migrates without losing progress', () => {
  const old = {schemaVersion:1,learnerId:'l1',displayName:'Nurse A',xp:120,rank:'Clinical Explorer',achievements:['a'],preferences:{difficulty:'guided'},competencyHistory:[{x:1}],createdAt:'a',updatedAt:'b'};
  const next = migrateRecord(old);
  assert.equal(next.schemaVersion, 32);
  assert.equal(next.learnerId, 'l1');
  assert.equal(next.xp, 120);
  assert.deepEqual(next.achievements, ['a']);
  assert.deepEqual(next.competencyHistory, [{x:1}]);
});
test('v1 run retains state', () => {
  const old = {schemaVersion:1,runId:'r1',kind:'shift',definitionId:'hospital_day',definitionVersion:'3.1',difficulty:'standard',startTime:'a',endTime:null,status:'active',state:{minute:44}};
  const next = migrateRecord(old);
  assert.equal(next.schemaVersion,32);
  assert.deepEqual(next.state,{minute:44});
});
test('unknown schema is rejected', () => assert.throws(() => migrateRecord({schemaVersion:999}), /Unsupported schema version/));
```

- [ ] **Step 2: Run the v3.2 gate and confirm RED**

Trigger `.ci/v32-gate.txt`. Expected: schema version/migration tests fail.

- [ ] **Step 3: Implement minimal v32 schema and pure migration**

Set `SCHEMA_VERSION = 32`. Preserve existing factory interfaces. In `migrateRecord`, clone v32 directly; for schema 1 clone and replace `schemaVersion` with 32 while preserving every existing enumerable field; reject every other version and non-object input.

- [ ] **Step 4: Trigger gate and verify GREEN**

Expected: v32 suite twice plus preserved v3.1 tests/checks pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/domain/schema.js web/src/persistence/migrations.js web/tests/v32/schema-migration.test.js
git commit -m "feat: migrate CareSyncD records to schema v32"
```

### Task 2: Transaction-safe backup import/export across schema versions

**Files:**
- Modify: `web/src/persistence/backup.js`
- Test: `web/tests/v32/backup-v32.test.js`

**Interfaces:**
- Produces: `exportProgress(adapter)` emits `format:'caresyncd-progress'`, schema 32.
- Produces: `importProgress(adapter,text)` accepts schema 1 or 32 and atomically migrates records.

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryAdapter } from '../../src/persistence/memory-adapter.js';
import { importProgress, exportProgress } from '../../src/persistence/backup.js';

test('v1 backup imports into v32', async () => {
  const adapter = await new MemoryAdapter().open();
  const old = JSON.stringify({format:'caresyncd-progress',schemaVersion:1,profiles:[{schemaVersion:1,learnerId:'l1',displayName:'A',xp:5,rank:'x',achievements:[],preferences:{},competencyHistory:[],createdAt:'a',updatedAt:'a'}],runs:[],active:null,meta:{}});
  const result = await importProgress(adapter, old);
  assert.equal(result.profiles[0].schemaVersion,32);
});
test('corrupt import preserves prior data', async () => {
  const adapter = await new MemoryAdapter().open();
  await adapter.putMeta('sentinel',{ok:true});
  const before = await adapter.dump();
  await assert.rejects(() => importProgress(adapter,'{"format":"wrong"}'));
  assert.deepEqual(await adapter.dump(),before);
});
test('export round trip is schema 32', async () => {
  const adapter = await new MemoryAdapter().open();
  const parsed = JSON.parse(await exportProgress(adapter));
  assert.equal(parsed.schemaVersion,32);
});
```

- [ ] **Step 2: Trigger gate; verify RED where v1 backup is rejected.**
- [ ] **Step 3: Change import validation to allow backup schema 1 or 32, then migrate every profile/run/active record before `replaceAll`; retain rollback-on-replace failure.**
- [ ] **Step 4: Trigger gate; verify GREEN.**
- [ ] **Step 5: Commit `feat: add schema-safe CareSyncD backup migration`.**

### Task 3: Autosnapshot and resume coordinator

**Files:**
- Create: `web/src/persistence/autosave-coordinator.js`
- Test: `web/tests/v32/autosave-resume.test.js`

**Interfaces:**
- Produces: `createAutosaveCoordinator({adapter, now})`
- Methods: `saveActive(run)`, `loadActive()`, `completeActive(completedRun)`, `clearActive()`.

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryAdapter } from '../../src/persistence/memory-adapter.js';
import { createAutosaveCoordinator } from '../../src/persistence/autosave-coordinator.js';

test('autosave snapshots by value', async () => {
  const adapter = await new MemoryAdapter().open();
  const saves = createAutosaveCoordinator({adapter,now:()=> '2026-09-25T00:00:00.000Z'});
  const run = {schemaVersion:32,runId:'r1',kind:'shift',definitionId:'hospital',definitionVersion:'3.2',difficulty:'standard',startTime:'x',endTime:null,status:'active',state:{minute:5}};
  await saves.saveActive(run);
  run.state.minute = 99;
  assert.equal((await saves.loadActive()).state.minute,5);
});
test('completion archives then clears active', async () => {
  const adapter = await new MemoryAdapter().open();
  const saves = createAutosaveCoordinator({adapter,now:()=> 'done'});
  const run = {schemaVersion:32,runId:'r1',kind:'shift',definitionId:'hospital',definitionVersion:'3.2',difficulty:'standard',startTime:'x',endTime:'done',status:'complete',state:{}};
  await adapter.putActiveRun({...run,status:'active'});
  await saves.completeActive(run);
  assert.equal(await adapter.getActiveRun(),null);
  assert.equal((await adapter.listRuns())[0].status,'complete');
});
```

- [ ] **Step 2: Trigger RED gate.**
- [ ] **Step 3: Implement coordinator using cloned values via adapter methods; stamp `autosavedAt` only in a copied record/state metadata, never caller object. Completion writes run history before clearing active.**
- [ ] **Step 4: Trigger GREEN gate.**
- [ ] **Step 5: Commit `feat: add local-first autosave and resume`.**

### Task 4: Conflict-safe local/cloud merge semantics

**Files:**
- Create: `web/src/persistence/sync-merge.js`
- Test: `web/tests/v32/sync-merge.test.js`

**Interfaces:**
- Produces: `mergeProgressBundles(local,remote) -> {bundle, conflicts}`.
- Completed runs dedupe by `runId`; newest `updatedAt/endTime` wins only for same ID.
- Distinct histories union by ID.
- Divergent non-null active runs produce `conflicts:[{type:'active-run',local,remote}]` and do not silently choose one.

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeProgressBundles } from '../../src/persistence/sync-merge.js';

test('completed history unions by runId', () => {
  const result = mergeProgressBundles({profiles:[],runs:[{runId:'a'}],active:null,meta:{}},{profiles:[],runs:[{runId:'b'}],active:null,meta:{}});
  assert.deepEqual(result.bundle.runs.map(r=>r.runId).sort(),['a','b']);
});
test('divergent active shifts are explicit conflict', () => {
  const result = mergeProgressBundles({profiles:[],runs:[],active:{runId:'a'},meta:{}},{profiles:[],runs:[],active:{runId:'b'},meta:{}});
  assert.equal(result.conflicts[0].type,'active-run');
  assert.equal(result.bundle.active,null);
});
```

- [ ] **Step 2: Trigger RED gate.**
- [ ] **Step 3: Implement pure deterministic merge; never mutate inputs. Merge profiles by learnerId using latest `updatedAt` only when IDs collide; union runs; preserve identical active run IDs by newest copy; conflict on different active IDs.**
- [ ] **Step 4: Trigger GREEN gate.**
- [ ] **Step 5: Commit `feat: add conflict-safe progress merge`.**

### Task 5: Career/cockpit presentation models

**Files:**
- Create: `web/src/ui/living-hospital-view-model.js`
- Create: `web/src/ui/career-map-view-model.js`
- Test: `web/tests/v32/living-hospital-ui-model.test.js`

**Interfaces:**
- `buildHospitalCockpitModel(world)` returns patient strip, active alerts, task counts, staffing summary, bed/census summary, simulated minute.
- `buildCareerMapModel({completedNodeIds,performance,competencySummary,xp})` evaluates every career node and exposes locked/unlocked/completed states without changing progression rules.

- [ ] **Step 1: Write failing tests ensuring model exposes all six units/career nodes, never mutates world, and labels Charge Nurse locked when leadership evidence is insufficient.**
- [ ] **Step 2: Trigger RED gate.**
- [ ] **Step 3: Implement pure presentation models by consuming existing unit catalog, career tree, and progression engine. No business rules duplicated in UI.**
- [ ] **Step 4: Trigger GREEN gate.**
- [ ] **Step 5: Commit `feat: add Living Hospital cockpit and career view models`.**

### Task 6: Service-worker update safety during active simulations

**Files:**
- Create: `web/src/app/update-coordinator.js`
- Modify: `web/service-worker.js` only if current worker activation behavior requires a message hook.
- Test: `web/tests/v32/update-coordinator.test.js`

**Interfaces:**
- `createUpdateCoordinator({getActiveRun,postSkipWaiting,reload})`
- `notifyWaiting(worker)` records update availability.
- `applyWhenSafe()` refuses while active run exists and returns `{applied:false,reason:'active-run'}`; otherwise requests activation and returns `{applied:true}`.

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpdateCoordinator } from '../../src/app/update-coordinator.js';

test('waiting update cannot activate during active run', async () => {
  let activated = 0;
  const c = createUpdateCoordinator({getActiveRun:async()=>({runId:'r1'}),postSkipWaiting:()=>activated++,reload:()=>{}});
  c.notifyWaiting({});
  assert.deepEqual(await c.applyWhenSafe(),{applied:false,reason:'active-run'});
  assert.equal(activated,0);
});
test('waiting update activates when no run exists', async () => {
  let activated = 0;
  const c = createUpdateCoordinator({getActiveRun:async()=>null,postSkipWaiting:()=>activated++,reload:()=>{}});
  c.notifyWaiting({});
  assert.deepEqual(await c.applyWhenSafe(),{applied:true});
  assert.equal(activated,1);
});
```

- [ ] **Step 2: Trigger RED gate.**
- [ ] **Step 3: Implement coordinator; if service worker lacks a `SKIP_WAITING` message handler, add only that handler. Do not call `skipWaiting()` on install automatically.**
- [ ] **Step 4: Trigger GREEN gate and full v3.1 compatibility checks.**
- [ ] **Step 5: Commit `feat: protect active shifts from PWA updates`.**

### Task 7: Phase 3 end-to-end local-first acceptance

**Files:**
- Create: `web/tests/v32/phase3-integration.test.js`

**Interfaces:**
- Consumes schema migration, backup, autosave, sync merge, career UI model, update coordinator.

- [ ] **Step 1: Write integration test that migrates a v1 backup, resumes a v32 active Living Hospital shift, autosaves an advanced minute, merges completed remote history, verifies no conflict for disjoint completed runs, renders a career model, and refuses a waiting PWA update while the active run exists.**
- [ ] **Step 2: Trigger the controlled v3.2 verification gate.**
- [ ] **Step 3: Verify v3.2 tests execute twice identically and all preserved v3.1 `npm test`, `check`, `check:site`, and `check:production` commands pass.**
- [ ] **Step 4: Commit `test: verify Phase 3 local-first acceptance`.**

## Phase 3 Completion Criteria

Phase 3 is complete only when:
- schema-v1 data migrates to v32 with retained progress/state,
- corrupt/unsupported backup import cannot damage existing local data,
- active shifts autosave/resume by value,
- local/cloud history merges without blind active-run overwrite,
- cockpit/career presentation models consume authoritative engines rather than duplicating rules,
- a waiting PWA update cannot replace an active simulation,
- the complete v3.2 suite is deterministic on two consecutive runs,
- all preserved v3.1 checks remain green,
- `main` and `gh-pages` remain unchanged.
