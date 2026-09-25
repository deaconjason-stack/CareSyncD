import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionController } from '../../src/app/session-controller.js';
import { MemoryAdapter } from '../../src/persistence/memory-adapter.js';

test('controller autosaves and resumes an active shift', async () => {
  const db = new MemoryAdapter(); const c1 = new SessionController({ persistence: db }); await c1.open();
  await c1.startShift({ shiftId: 'hospital_day', learnerName: 'Learner', difficulty: 'standard' });
  await c1.tick(20);
  const c2 = new SessionController({ persistence: db }); await c2.open();
  const resumed = await c2.resumeActive();
  assert.equal(resumed.clock, '07:20');
});

test('completed run moves to history and clears active state', async () => {
  const db = new MemoryAdapter(); const c = new SessionController({ persistence: db }); await c.open();
  await c.startScenario({ scenarioId: 'hypoxia', learnerName: 'Learner', difficulty: 'standard' });
  await c.finishActive('manual');
  assert.equal(await db.getActiveRun(), null);
  assert.equal((await db.listRuns()).length, 1);
});

test('engine-completed scenario automatically moves from active storage to history', async () => {
  const db = new MemoryAdapter(); const c = new SessionController({ persistence: db }); await c.open();
  await c.startScenario({ scenarioId: 'hypoxia', learnerName: 'Learner', difficulty: 'standard' });
  for (const action of ['assess','airway','oxygen','monitor','notify_provider','reassess']) await c.action(action);
  assert.equal(c.snapshot().status,'complete');
  assert.equal(await db.getActiveRun(), null);
  assert.equal((await db.listRuns()).length,1);
});

test('controller changes focus within a shift without exposing engine internals', async () => {
  const db = new MemoryAdapter(); const c = new SessionController({ persistence: db }); await c.open();
  const start = await c.startShift({ shiftId:'hospital_day', learnerName:'Learner', difficulty:'standard' });
  const target = start.patients[1].id;
  const next = await c.selectPatient(target);
  assert.equal(next.activePatientId,target);
  assert.equal((await db.getActiveRun()).state.activePatientId,target);
});
