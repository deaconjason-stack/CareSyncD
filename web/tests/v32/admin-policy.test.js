import test from 'node:test';
import assert from 'node:assert/strict';
import { createPriceVersion } from '../../src/commercial/pricing-catalog.js';
import { ADMIN_ACTIONS, evaluateAdminAction } from '../../src/admin/admin-policy.js';
import { createAuditEntry } from '../../src/admin/audit-entry.js';

const price = (id, amountCents) => createPriceVersion({
  id,planId:'individual',cadence:'monthly',amountCents,
  entitlements:['living-hospital'],effectiveAt:'2026-10-01T00:00:00Z'
});

test('Founder can perform every declared admin action without a higher approval gate', () => {
  for (const action of ADMIN_ACTIONS) {
    const result=evaluateAdminAction({actorRole:'founder',action,targetRole:'founder'});
    assert.equal(result.allowed,true,action);
    assert.equal(result.requiresFounderApproval,false,action);
  }
});

test('Admin can perform ordinary subscriber, instructor, organization, report, content and promotion operations', () => {
  for (const action of ['manage_subscriber','manage_instructor','manage_organization','manage_reports','manage_content','manage_promotion']) {
    assert.deepEqual(evaluateAdminAction({actorRole:'admin',action}),{
      allowed:true,requiresFounderApproval:false,reasons:[]
    });
  }
});

test('Admin cannot remove, demote, replace Founder or transfer ownership', () => {
  for (const action of ['transfer_ownership','remove_founder','demote_founder','replace_founder','manage_payment_ownership','manage_security_ownership']) {
    const result=evaluateAdminAction({actorRole:'admin',action,targetRole:'founder'});
    assert.equal(result.allowed,false,action);
    assert.equal(result.requiresFounderApproval,false,action);
    assert.ok(result.reasons.includes('founder-protected'),action);
  }
});

test('exact ten percent pricing change can be prepared by Admin but requires Founder approval', () => {
  const previous=price('v1',1000);
  const next=price('v2',1100);
  const result=evaluateAdminAction({actorRole:'admin',action:'propose_pricing_change',previousPrice:previous,nextPrice:next});
  assert.equal(result.allowed,true);
  assert.equal(result.requiresFounderApproval,true);
  assert.ok(result.reasons.includes('base-price-change-10-percent-or-more'));
});

test('9.9 percent pricing change remains ordinary for Admin', () => {
  const result=evaluateAdminAction({actorRole:'admin',action:'propose_pricing_change',previousPrice:price('v1',1000),nextPrice:price('v2',1099)});
  assert.deepEqual(result,{allowed:true,requiresFounderApproval:false,reasons:[]});
});

test('non-admin roles cannot perform business administration actions', () => {
  for (const role of ['learner','instructor','organization_admin']) {
    const result=evaluateAdminAction({actorRole:role,action:'manage_subscriber'});
    assert.equal(result.allowed,false);
    assert.ok(result.reasons.includes('insufficient-role'));
  }
});

test('audit entry is immutable, structured, and rejects secret-bearing keys recursively', () => {
  const entry=createAuditEntry({
    id:'audit-1',actorId:'acct-admin',actorRole:'admin',action:'manage_organization',
    targetType:'organization',targetId:'org-1',occurredAt:'2026-09-25T15:30:00Z',
    data:{change:'seat-limit',before:10,after:20,nested:{approved:true}}
  });
  assert.ok(Object.isFrozen(entry));
  assert.ok(Object.isFrozen(entry.data));
  assert.equal(entry.occurredAt,'2026-09-25T15:30:00.000Z');
  assert.deepEqual(entry.data,{change:'seat-limit',before:10,after:20,nested:{approved:true}});

  for (const key of ['password','token','secret','serviceRoleKey','clientSecret','cardNumber','cvv']) {
    assert.throws(()=>createAuditEntry({
      id:'bad',actorId:'a',actorRole:'admin',action:'manage_organization',targetType:'x',targetId:'y',
      occurredAt:'2026-09-25T15:30:00Z',data:{nested:{[key]:'do-not-store'}}
    }),/secret|sensitive|audit data/i,key);
  }
});

test('audit entry validates timestamp and required provenance', () => {
  assert.throws(()=>createAuditEntry({id:'',actorId:'a',actorRole:'admin',action:'x',targetType:'x',targetId:'y',occurredAt:'2026-09-25'}),/id/i);
  assert.throws(()=>createAuditEntry({id:'a',actorId:'',actorRole:'admin',action:'x',targetType:'x',targetId:'y',occurredAt:'2026-09-25'}),/actorId/i);
  assert.throws(()=>createAuditEntry({id:'a',actorId:'a',actorRole:'admin',action:'x',targetType:'x',targetId:'y',occurredAt:'bad'}),/occurredAt/i);
});
