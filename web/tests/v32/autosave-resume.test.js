import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryAdapter } from '../../src/persistence/memory-adapter.js';
import { createAutosaveCoordinator } from '../../src/persistence/autosave-coordinator.js';

function activeRun() {
  return {
    schemaVersion:32,
    runId:'r1',
    kind:'shift',
    definitionId:'living-hospital',
    definitionVersion:'3.2',
    difficulty:'standard',
    startTime:'2026-09-25T00:00:00.000Z',
    endTime:null,
    status:'active',
    state:{minute:5,patients:[{id:'p1',status:'stable'}]}
  };
}

test('autosave snapshots by value and stamps only the saved copy', async () => {
  const adapter = await new MemoryAdapter().open();
  const saves = createAutosaveCoordinator({adapter,now:()=> '2026-09-25T00:05:00.000Z'});
  const run = activeRun();
  await saves.saveActive(run);
  run.state.minute = 99;
  run.state.patients[0].status = 'mutated-outside';
  assert.equal(run.autosavedAt, undefined);
  const restored = await saves.loadActive();
  assert.equal(restored.state.minute,5);
  assert.equal(restored.state.patients[0].status,'stable');
  assert.equal(restored.autosavedAt,'2026-09-25T00:05:00.000Z');
});

test('load returns a clone so resumed state cannot mutate storage', async () => {
  const adapter = await new MemoryAdapter().open();
  const saves = createAutosaveCoordinator({adapter,now:()=> 't'});
  await saves.saveActive(activeRun());
  const first = await saves.loadActive();
  first.state.minute = 77;
  assert.equal((await saves.loadActive()).state.minute,5);
});

test('completion archives before clearing active state', async () => {
  const adapter = await new MemoryAdapter().open();
  const saves = createAutosaveCoordinator({adapter,now:()=> 'done'});
  const active = activeRun();
  await saves.saveActive(active);
  const completed = {...active,endTime:'done',status:'complete',state:{...active.state,minute:480}};
  await saves.completeActive(completed);
  assert.equal(await adapter.getActiveRun(),null);
  const runs = await adapter.listRuns();
  assert.equal(runs.length,1);
  assert.equal(runs[0].status,'complete');
  assert.equal(runs[0].state.minute,480);
});

test('clearActive removes only active run', async () => {
  const adapter = await new MemoryAdapter().open();
  const saves = createAutosaveCoordinator({adapter,now:()=> 't'});
  await adapter.putRun({...activeRun(),runId:'history',status:'complete'});
  await saves.saveActive(activeRun());
  await saves.clearActive();
  assert.equal(await saves.loadActive(),null);
  assert.equal((await adapter.listRuns()).length,1);
});
