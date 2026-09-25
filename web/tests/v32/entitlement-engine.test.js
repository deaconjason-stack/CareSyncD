import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntitlementSnapshot, evaluateEntitlement } from '../../src/commercial/entitlement-engine.js';

const valid = (overrides={}) => createEntitlementSnapshot({
  id:'ent-1', accountId:'acct-1', planId:'individual',
  features:['living-hospital','career-progression'],
  verifiedByServer:true,
  issuedAt:'2026-10-01T00:00:00.000Z',
  expiresAt:'2026-10-20T00:00:00.000Z',
  ...overrides
});

test('browser-spoofed entitlement is demo-only', () => {
  const spoof = {accountId:'acct-1',planId:'individual',features:['living-hospital'],verifiedByServer:false,issuedAt:'2026-10-01T00:00:00Z',expiresAt:'2026-10-20T00:00:00Z'};
  assert.deepEqual(evaluateEntitlement(spoof,{now:'2026-10-02T00:00:00Z',offline:false,startingNewShift:true}),{access:'demo',features:[],reason:'unverified'});
});

test('server-verified current snapshot grants premium features', () => {
  const result = evaluateEntitlement(valid(),{now:'2026-10-02T00:00:00Z',offline:false,startingNewShift:true});
  assert.equal(result.access,'premium');
  assert.deepEqual(result.features,['career-progression','living-hospital']);
});

test('offline cache is hard-limited to seven days from issue time', () => {
  const snapshot = valid({expiresAt:'2026-12-01T00:00:00Z'});
  assert.equal(evaluateEntitlement(snapshot,{now:'2026-10-08T00:00:00Z',offline:true,startingNewShift:true}).access,'premium');
  const expired = evaluateEntitlement(snapshot,{now:'2026-10-08T00:00:00.001Z',offline:true,startingNewShift:true});
  assert.equal(expired.access,'demo');
  assert.equal(expired.reason,'offline-cache-expired');
});

test('expired entitlement cannot start a new premium shift', () => {
  const result = evaluateEntitlement(valid({expiresAt:'2026-10-03T00:00:00Z'}),{now:'2026-10-03T00:00:01Z',offline:false,startingNewShift:true});
  assert.equal(result.access,'demo');
  assert.equal(result.reason,'entitlement-expired');
});

test('shift begun while entitlement was valid may finish after entitlement expires', () => {
  const snapshot = valid({expiresAt:'2026-10-03T00:00:00Z'});
  const result = evaluateEntitlement(snapshot,{
    now:'2026-10-10T00:00:00Z',offline:true,startingNewShift:false,
    activeShiftStartedAt:'2026-10-02T12:00:00Z'
  });
  assert.equal(result.access,'finish-active-only');
  assert.deepEqual(result.features,['career-progression','living-hospital']);
});

test('shift started after entitlement expiry is not grandfathered into active access', () => {
  const snapshot = valid({expiresAt:'2026-10-03T00:00:00Z'});
  const result = evaluateEntitlement(snapshot,{
    now:'2026-10-04T00:00:00Z',offline:true,startingNewShift:false,
    activeShiftStartedAt:'2026-10-03T00:00:01Z'
  });
  assert.equal(result.access,'demo');
});

test('created snapshot must be server verified and has immutable normalized features', () => {
  assert.throws(()=>createEntitlementSnapshot({id:'x',accountId:'a',planId:'individual',features:[],verifiedByServer:false,issuedAt:'2026-10-01',expiresAt:'2026-10-02'}),/server verified/i);
  const snapshot = valid({features:['z','a','z']});
  assert.deepEqual(snapshot.features,['a','z']);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.features));
});
