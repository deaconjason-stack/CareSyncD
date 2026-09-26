import test from 'node:test';
import assert from 'node:assert/strict';
import { buildV32PreviewRuntime } from '../../src/app/v32-preview-runtime.js';

const now='2026-09-25T20:00:00.000Z';

function baseInput(overrides={}){
  return {
    now,
    online:true,
    backendConnected:false,
    entitlementSnapshot:null,
    startingNewShift:true,
    activeShiftStartedAt:null,
    career:{completedNodeIds:[],performance:{overall:0},competencySummary:{clinicalJudgment:{score:0},operations:{score:0},communication:{score:0},leadership:{score:0}},xp:0},
    founderSnapshot:null,
    ...overrides
  };
}

test('preview runtime exposes the six-unit catalog and approved capability surfaces',()=>{
  const runtime=buildV32PreviewRuntime(baseInput());
  assert.equal(runtime.units.length,6);
  assert.deepEqual(runtime.units.map(unit=>unit.id),['med-surg','ed','telemetry','icu','pediatrics','ob']);
  assert.equal(runtime.capabilities.organizations,true);
  assert.equal(runtime.capabilities.instructorLive,true);
  assert.equal(runtime.capabilities.simulationLab,true);
  assert.equal(runtime.safety.educationalOnly,true);
  assert.equal(runtime.safety.acceptsPHI,false);
});

test('missing backend data produces truthful empty Founder state rather than invented business data',()=>{
  const runtime=buildV32PreviewRuntime(baseInput());
  assert.equal(runtime.backend.connected,false);
  assert.equal(runtime.backend.mode,'local-first');
  assert.equal(runtime.founder.metrics.totalSubscribers,0);
  assert.equal(runtime.founder.metrics.activeSubscribers,0);
  assert.deepEqual(runtime.founder.subscriberRows,[]);
});

test('browser-local or unverified entitlement flags cannot grant premium access',()=>{
  const runtime=buildV32PreviewRuntime(baseInput({
    entitlementSnapshot:{
      id:'fake',accountId:'acct',planId:'individual',features:['living-hospital'],
      verifiedByServer:false,issuedAt:'2026-09-25T19:00:00.000Z',expiresAt:'2026-09-26T19:00:00.000Z'
    },
    browserPremium:true
  }));
  assert.equal(runtime.access.access,'demo');
  assert.deepEqual(runtime.access.features,[]);
  assert.equal(runtime.access.reason,'unverified');
});

test('current server-verified entitlement grants only its verified feature set',()=>{
  const runtime=buildV32PreviewRuntime(baseInput({
    entitlementSnapshot:{
      id:'ent-1',accountId:'acct',planId:'individual',features:['career','living-hospital'],
      verifiedByServer:true,issuedAt:'2026-09-25T19:00:00.000Z',expiresAt:'2026-09-26T19:00:00.000Z'
    }
  }));
  assert.equal(runtime.access.access,'premium');
  assert.deepEqual(runtime.access.features,['career','living-hospital']);
});

test('offline preview remains simulation-capable while entitlement semantics remain authoritative',()=>{
  const runtime=buildV32PreviewRuntime(baseInput({online:false,backendConnected:false}));
  assert.equal(runtime.backend.online,false);
  assert.equal(runtime.backend.simulationAvailable,true);
  assert.equal(runtime.access.access,'demo');
  assert.equal(runtime.units.length,6);
});

test('runtime output is isolated from caller mutation',()=>{
  const input=baseInput();
  const runtime=buildV32PreviewRuntime(input);
  assert.ok(Object.isFrozen(runtime));
  assert.ok(Object.isFrozen(runtime.units));
  input.career.xp=999999;
  assert.notEqual(runtime.career.xp,999999);
});
