import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryAdapter } from '../../src/persistence/memory-adapter.js';
import { importProgress, exportProgress } from '../../src/persistence/backup.js';

test('v1 backup imports into v32 without losing learner progress', async () => {
  const adapter = await new MemoryAdapter().open();
  const old = JSON.stringify({
    format:'caresyncd-progress',
    schemaVersion:1,
    profiles:[{
      schemaVersion:1,learnerId:'l1',displayName:'A',xp:5,rank:'Clinical Explorer',
      achievements:['first'],preferences:{difficulty:'guided'},competencyHistory:[],createdAt:'a',updatedAt:'a'
    }],
    runs:[{
      schemaVersion:1,runId:'r1',kind:'shift',definitionId:'hospital_day',definitionVersion:'3.1',
      difficulty:'standard',startTime:'a',endTime:null,status:'active',state:{minute:31}
    }],
    active:null,
    meta:{source:'legacy'}
  });
  const result = await importProgress(adapter, old);
  assert.equal(result.profiles[0].schemaVersion,32);
  assert.equal(result.profiles[0].xp,5);
  assert.equal(result.runs[0].schemaVersion,32);
  assert.deepEqual(result.runs[0].state,{minute:31});
  assert.equal(result.meta.source,'legacy');
});

test('corrupt or foreign import preserves prior data byte-for-byte', async () => {
  const adapter = await new MemoryAdapter().open();
  await adapter.putMeta('sentinel',{ok:true});
  const before = await adapter.dump();
  await assert.rejects(() => importProgress(adapter,'{"format":"wrong"}'), /Invalid CareSyncD backup/);
  assert.deepEqual(await adapter.dump(),before);
  await assert.rejects(() => importProgress(adapter,'not-json'), /Invalid backup JSON/);
  assert.deepEqual(await adapter.dump(),before);
});

test('unsupported backup schema is rejected before replacement', async () => {
  const adapter = await new MemoryAdapter().open();
  await adapter.putMeta('sentinel',{ok:true});
  const before = await adapter.dump();
  const text = JSON.stringify({format:'caresyncd-progress',schemaVersion:999,profiles:[],runs:[],active:null,meta:{}});
  await assert.rejects(() => importProgress(adapter,text), /Unsupported backup schema version/);
  assert.deepEqual(await adapter.dump(),before);
});

test('export is CareSyncD schema v32 and round trips', async () => {
  const adapter = await new MemoryAdapter().open();
  const parsed = JSON.parse(await exportProgress(adapter));
  assert.equal(parsed.format,'caresyncd-progress');
  assert.equal(parsed.schemaVersion,32);
  const restored = await new MemoryAdapter().open();
  const result = await importProgress(restored,JSON.stringify(parsed));
  assert.deepEqual(result,await restored.dump());
});
