import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryAdapter } from '../../src/persistence/memory-adapter.js';
import { exportProgress, importProgress } from '../../src/persistence/backup.js';

test('memory persistence stores active run and completed history', async () => {
  const db = new MemoryAdapter(); await db.open();
  await db.putActiveRun({ schemaVersion: 1, runId: 'a', status: 'active' });
  assert.equal((await db.getActiveRun()).runId, 'a');
  await db.putRun({ schemaVersion: 1, runId: 'done', status: 'complete' });
  assert.equal((await db.listRuns()).length, 1);
});

test('corrupt backup is rejected without changing existing data', async () => {
  const db = new MemoryAdapter(); await db.open();
  await db.putProfile({ schemaVersion: 1, learnerId: 'l1', displayName: 'Existing' });
  await assert.rejects(() => importProgress(db, '{bad json'), /Invalid backup JSON/);
  assert.equal((await db.getProfile('l1')).displayName, 'Existing');
});

test('export and import round trip versioned progress', async () => {
  const source = new MemoryAdapter(); await source.open();
  await source.putProfile({ schemaVersion: 1, learnerId: 'l1', displayName: 'Learner' });
  await source.putRun({ schemaVersion: 1, runId: 'r1', status: 'complete' });
  const text = await exportProgress(source);
  const target = new MemoryAdapter(); await target.open();
  await importProgress(target, text);
  assert.equal((await target.getProfile('l1')).displayName, 'Learner');
  assert.equal((await target.listRuns())[0].runId, 'r1');
});

test('IndexedDB adapter fails clearly when browser storage is unavailable', async () => {
  const { IndexedDBAdapter } = await import('../../src/persistence/indexeddb-adapter.js');
  const db = new IndexedDBAdapter(null);
  await assert.rejects(() => db.open(), /IndexedDB is unavailable/);
});
