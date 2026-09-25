import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_EVENT_TYPES,
  createAnalyticsEvent,
  linkAnalyticsIdentity
} from '../../src/analytics/analytics-event.js';

const base = (overrides = {}) => ({
  id:'evt-1',
  type:'page_view',
  occurredAt:'2026-09-25T15:00:00.000Z',
  anonymousId:'anon-1',
  properties:{page:'/pricing',referrerHost:'linkedin.com',deviceClass:'desktop'},
  ...overrides
});

test('analytics exposes exactly the approved funnel and learning event types', () => {
  assert.deepEqual([...ANALYTICS_EVENT_TYPES], [
    'page_view','pricing_view','demo_started','account_created','checkout_started',
    'subscription_verified','shift_started','shift_completed','renewal'
  ]);
});

test('anonymous visitor event stays anonymous until explicitly linked', () => {
  const event = createAnalyticsEvent(base());
  assert.equal(event.anonymousId,'anon-1');
  assert.equal(event.accountId,null);
  assert.deepEqual(event.properties,{page:'/pricing',referrerHost:'linkedin.com',deviceClass:'desktop'});

  const linked = linkAnalyticsIdentity(event,'acct-1');
  assert.equal(linked.accountId,'acct-1');
  assert.equal(linked.anonymousId,'anon-1');
  assert.equal(event.accountId,null);
});

test('approved structured acquisition, commercial, and learning properties are accepted', () => {
  const event = createAnalyticsEvent(base({
    type:'shift_completed',
    properties:{
      page:'/living-hospital',referrerHost:'example.org',deviceClass:'tablet',browserFamily:'Chrome',
      regionCode:'US-MO',planId:'individual',cadence:'monthly',source:'linkedin',unitId:'med-surg',shiftFormat:'career'
    }
  }));
  assert.equal(event.properties.unitId,'med-surg');
  assert.equal(event.properties.source,'linkedin');
  assert.equal(event.properties.regionCode,'US-MO');
});

test('patient identifiers, clinical text, notes, and arbitrary unknown properties are rejected', () => {
  for (const key of ['patient','patientId','patientName','mrn','diagnosis','clinicalText','note','notes','freeText','symptoms','medication']) {
    assert.throws(() => createAnalyticsEvent(base({properties:{page:'/x',[key]:'forbidden'}})),/analytics property|not allowed|forbidden/i,key);
  }
  assert.throws(() => createAnalyticsEvent(base({properties:{page:'/x',favoriteColor:'blue'}})),/analytics property|not allowed/i);
});

test('event type, timestamp, id, and anonymous identity are validated', () => {
  assert.throws(() => createAnalyticsEvent(base({type:'patient_deteriorated'})),/event type/i);
  assert.throws(() => createAnalyticsEvent(base({occurredAt:'not-a-date'})),/occurredAt/i);
  assert.throws(() => createAnalyticsEvent(base({id:''})),/id/i);
  assert.throws(() => createAnalyticsEvent(base({anonymousId:''})),/anonymousId/i);
  assert.throws(() => linkAnalyticsIdentity(createAnalyticsEvent(base()),''),/accountId/i);
});

test('analytics event and property bag are immutable copies', () => {
  const input = base();
  const event = createAnalyticsEvent(input);
  assert.ok(Object.isFrozen(event));
  assert.ok(Object.isFrozen(event.properties));
  input.properties.page='/mutated';
  assert.equal(event.properties.page,'/pricing');
});

test('identity linking creates a new immutable event and never invents identity', () => {
  const anonymous = createAnalyticsEvent(base());
  const linked = linkAnalyticsIdentity(anonymous,'acct-9');
  assert.notEqual(linked,anonymous);
  assert.ok(Object.isFrozen(linked));
  assert.equal(linked.accountId,'acct-9');
  assert.equal(anonymous.accountId,null);
});
