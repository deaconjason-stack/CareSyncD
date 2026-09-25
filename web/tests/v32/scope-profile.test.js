import test from 'node:test';
import assert from 'node:assert/strict';
import { createScopeProfile, policyForRole } from '../../src/living-hospital/scope-profile.js';

test('the same LPN action may differ between facility profiles', () => {
  const a = createScopeProfile({ id:'a', jurisdiction:'configured-a', facility:'A', roles:{ lpn:{ perform:['assess'], delegate:{} } } });
  const b = createScopeProfile({ id:'b', jurisdiction:'configured-b', facility:'B', roles:{ lpn:{ perform:['assess','iv_access'], delegate:{} } } });
  assert.equal(policyForRole(a,'lpn').canPerform('iv_access'), false);
  assert.equal(policyForRole(b,'lpn').canPerform('iv_access'), true);
});

test('delegation permissions vary only with supplied configuration', () => {
  const a = createScopeProfile({ id:'a', jurisdiction:'configured-a', facility:'A', roles:{ lpn:{ perform:[], delegate:{ vitals:['cna'] } } } });
  const b = createScopeProfile({ id:'b', jurisdiction:'configured-b', facility:'B', roles:{ lpn:{ perform:[], delegate:{} } } });
  assert.equal(policyForRole(a,'lpn').canDelegate('vitals','cna'), true);
  assert.equal(policyForRole(b,'lpn').canDelegate('vitals','cna'), false);
});

test('profile normalization isolates later caller mutation', () => {
  const config = { id:'x', jurisdiction:'configured-x', facility:'X', roles:{ lpn:{ perform:['assess'], delegate:{ vitals:['cna'] } } } };
  const profile = createScopeProfile(config);
  config.roles.lpn.perform.push('iv_access');
  config.roles.lpn.delegate.vitals.push('rn');
  assert.equal(policyForRole(profile,'lpn').canPerform('iv_access'), false);
  assert.equal(policyForRole(profile,'lpn').canDelegate('vitals','rn'), false);
});

test('unknown roles are rejected instead of inheriting hidden defaults', () => {
  const profile = createScopeProfile({ id:'x', jurisdiction:'configured-x', facility:'X', roles:{ lpn:{ perform:[], delegate:{} } } });
  assert.throws(() => policyForRole(profile,'rn'), /Unknown role/);
});
