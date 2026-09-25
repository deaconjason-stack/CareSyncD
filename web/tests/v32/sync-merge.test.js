import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeProgressBundles } from '../../src/persistence/sync-merge.js';

const base = () => ({profiles:[],runs:[],active:null,meta:{}});

test('completed history unions by runId', () => {
  const local = {...base(),runs:[{runId:'a',endTime:'2026-01-01'}]};
  const remote = {...base(),runs:[{runId:'b',endTime:'2026-01-02'}]};
  const result = mergeProgressBundles(local,remote);
  assert.deepEqual(result.bundle.runs.map(r=>r.runId).sort(),['a','b']);
  assert.deepEqual(result.conflicts,[]);
});

test('same runId keeps the newer copy', () => {
  const local = {...base(),runs:[{runId:'a',endTime:'2026-01-01',score:70}]};
  const remote = {...base(),runs:[{runId:'a',endTime:'2026-01-03',score:90}]};
  assert.equal(mergeProgressBundles(local,remote).bundle.runs[0].score,90);
});

test('profiles merge by learnerId and newest updatedAt', () => {
  const local = {...base(),profiles:[{learnerId:'l1',updatedAt:'2026-01-01',xp:10}]};
  const remote = {...base(),profiles:[{learnerId:'l1',updatedAt:'2026-01-02',xp:20},{learnerId:'l2',updatedAt:'2026-01-01',xp:5}]};
  const profiles = mergeProgressBundles(local,remote).bundle.profiles.sort((a,b)=>a.learnerId.localeCompare(b.learnerId));
  assert.deepEqual(profiles.map(p=>[p.learnerId,p.xp]),[['l1',20],['l2',5]]);
});

test('divergent active shifts are explicit conflict and neither is chosen', () => {
  const local = {...base(),active:{runId:'a',autosavedAt:'2026-01-01',state:{minute:20}}};
  const remote = {...base(),active:{runId:'b',autosavedAt:'2026-01-02',state:{minute:40}}};
  const result = mergeProgressBundles(local,remote);
  assert.equal(result.bundle.active,null);
  assert.equal(result.conflicts.length,1);
  assert.equal(result.conflicts[0].type,'active-run');
  assert.equal(result.conflicts[0].local.runId,'a');
  assert.equal(result.conflicts[0].remote.runId,'b');
});

test('same active runId keeps newer snapshot without conflict', () => {
  const local = {...base(),active:{runId:'a',autosavedAt:'2026-01-01',state:{minute:20}}};
  const remote = {...base(),active:{runId:'a',autosavedAt:'2026-01-02',state:{minute:40}}};
  const result = mergeProgressBundles(local,remote);
  assert.equal(result.bundle.active.state.minute,40);
  assert.deepEqual(result.conflicts,[]);
});

test('merge never mutates inputs', () => {
  const local = {...base(),runs:[{runId:'a',state:{x:1}}]};
  const remote = {...base(),runs:[{runId:'b',state:{x:2}}]};
  const localBefore = structuredClone(local);
  const remoteBefore = structuredClone(remote);
  const result = mergeProgressBundles(local,remote);
  result.bundle.runs[0].state.x = 999;
  assert.deepEqual(local,localBefore);
  assert.deepEqual(remote,remoteBefore);
});
