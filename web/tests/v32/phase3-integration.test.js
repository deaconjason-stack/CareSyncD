import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryAdapter } from '../../src/persistence/memory-adapter.js';
import { importProgress } from '../../src/persistence/backup.js';
import { createAutosaveCoordinator } from '../../src/persistence/autosave-coordinator.js';
import { mergeProgressBundles } from '../../src/persistence/sync-merge.js';
import { buildCareerMapModel } from '../../src/ui/career-map-view-model.js';
import { createUpdateCoordinator } from '../../src/app/update-coordinator.js';

test('Phase 3 acceptance preserves, resumes, merges, presents, and protects an active Living Hospital shift', async () => {
  const adapter = await new MemoryAdapter().open();
  const legacy = JSON.stringify({
    format:'caresyncd-progress',schemaVersion:1,
    profiles:[{schemaVersion:1,learnerId:'learner-1',displayName:'Learner',xp:25,rank:'Clinical Explorer',achievements:[],preferences:{difficulty:'standard'},competencyHistory:[],createdAt:'a',updatedAt:'a'}],
    runs:[{schemaVersion:1,runId:'completed-local',kind:'shift',definitionId:'hospital_day',definitionVersion:'3.1',difficulty:'standard',startTime:'a',endTime:'b',status:'complete',state:{minute:480}}],
    active:{schemaVersion:1,runId:'active-1',kind:'shift',definitionId:'living-hospital',definitionVersion:'3.2',difficulty:'standard',startTime:'a',endTime:null,status:'active',state:{minute:22}},
    meta:{source:'legacy-device'}
  });

  await importProgress(adapter,legacy);
  const autosave = createAutosaveCoordinator({adapter,now:()=> '2026-09-25T01:00:00.000Z'});
  const resumed = await autosave.loadActive();
  assert.equal(resumed.schemaVersion,32);
  assert.equal(resumed.state.minute,22);

  resumed.state.minute = 37;
  await autosave.saveActive(resumed);
  assert.equal((await autosave.loadActive()).state.minute,37);

  const local = await adapter.dump();
  const remote = {
    profiles:[],
    runs:[{schemaVersion:32,runId:'completed-remote',kind:'shift',definitionId:'living-hospital',definitionVersion:'3.2',difficulty:'guided',startTime:'x',endTime:'y',status:'complete',state:{minute:30}}],
    active:null,
    meta:{cloud:true}
  };
  const merged = mergeProgressBundles(local,remote);
  assert.deepEqual(merged.bundle.runs.map(r=>r.runId).sort(),['completed-local','completed-remote']);
  assert.deepEqual(merged.conflicts,[]);
  assert.equal(merged.bundle.active.runId,'active-1');

  const career = buildCareerMapModel({completedNodeIds:[],performance:{overall:0},competencySummary:{},xp:25});
  assert.equal(career.specialty.filter(node=>node.starting && node.state==='unlocked').length,6);

  let activations = 0;
  const updates = createUpdateCoordinator({
    getActiveRun:()=>autosave.loadActive(),
    postSkipWaiting:()=>activations++,
    reload:()=>{}
  });
  updates.notifyWaiting({id:'next-worker'});
  assert.deepEqual(await updates.applyWhenSafe(),{applied:false,reason:'active-run'});
  assert.equal(activations,0);
});
