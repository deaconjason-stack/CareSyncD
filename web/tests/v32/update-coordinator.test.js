import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpdateCoordinator } from '../../src/app/update-coordinator.js';

test('waiting update cannot activate during active run', async () => {
  let activated = 0;
  const c = createUpdateCoordinator({
    getActiveRun:async()=>({runId:'r1'}),
    postSkipWaiting:()=>activated++,
    reload:()=>{}
  });
  c.notifyWaiting({id:'worker'});
  assert.deepEqual(await c.applyWhenSafe(),{applied:false,reason:'active-run'});
  assert.equal(activated,0);
});

test('waiting update activates when no active run exists', async () => {
  let activated = 0;
  const c = createUpdateCoordinator({
    getActiveRun:async()=>null,
    postSkipWaiting:worker=>{ assert.deepEqual(worker,{id:'worker'}); activated++; },
    reload:()=>{}
  });
  c.notifyWaiting({id:'worker'});
  assert.deepEqual(await c.applyWhenSafe(),{applied:true});
  assert.equal(activated,1);
});

test('no waiting worker returns explicit no-update result', async () => {
  const c = createUpdateCoordinator({getActiveRun:async()=>null,postSkipWaiting:()=>{},reload:()=>{}});
  assert.deepEqual(await c.applyWhenSafe(),{applied:false,reason:'no-update'});
});

test('controller change reloads only after an update was applied', async () => {
  let reloads = 0;
  const c = createUpdateCoordinator({getActiveRun:async()=>null,postSkipWaiting:()=>{},reload:()=>reloads++});
  c.handleControllerChange();
  assert.equal(reloads,0);
  c.notifyWaiting({});
  await c.applyWhenSafe();
  c.handleControllerChange();
  c.handleControllerChange();
  assert.equal(reloads,1);
});
