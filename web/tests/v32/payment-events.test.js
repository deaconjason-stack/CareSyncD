import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoSubscription } from '../../src/commercial/subscription-state.js';
import { normalizePaymentEvent, applyPaymentEvent } from '../../src/commercial/payment-events.js';

const initial = () => ({subscription:createDemoSubscription('acct-1'),processedEventIds:[],lastOccurredAt:null});
const normalized = (overrides={}) => normalizePaymentEvent({
  provider:'paypal', eventId:'evt-1', type:'subscription_activated',
  occurredAt:'2026-10-01T00:00:00.000Z', verified:true,
  providerSubscriptionId:'P-1', priceVersionId:'v1', ...overrides
});

test('normalization preserves provider-neutral commercial event fields',()=>{
  const event=normalized();
  assert.equal(event.id,'evt-1');
  assert.equal(event.provider,'paypal');
  assert.equal(event.type,'subscription_activated');
  assert.equal(event.verified,true);
});

test('unverified payment events never mutate subscription state',()=>{
  const state=initial();
  assert.throws(()=>applyPaymentEvent(state,normalized({verified:false})),/verified/i);
  assert.equal(state.subscription.billingState,'registered_demo');
});

test('duplicate provider event id is idempotent',()=>{
  const once=applyPaymentEvent(initial(),normalized());
  const twice=applyPaymentEvent(once,normalized());
  assert.deepEqual(twice,once);
  assert.deepEqual(once.processedEventIds,['evt-1']);
});

test('stale event cannot regress newer subscription state',()=>{
  let state=applyPaymentEvent(initial(),normalized({eventId:'new',occurredAt:'2026-10-05T00:00:00Z'}));
  const stale=normalized({eventId:'old',type:'subscription_expired',occurredAt:'2026-10-04T23:59:59Z'});
  const next=applyPaymentEvent(state,stale);
  assert.equal(next.subscription.billingState,'active');
  assert.equal(next.lastOccurredAt,'2026-10-05T00:00:00.000Z');
});

test('current events map through activation, payment issue, cancellation and expiration',()=>{
  let state=applyPaymentEvent(initial(),normalized());
  state=applyPaymentEvent(state,normalized({eventId:'fail',type:'payment_failed',occurredAt:'2026-10-02T00:00:00Z'}));
  assert.equal(state.subscription.billingState,'payment_issue');
  state=applyPaymentEvent(state,normalized({eventId:'recover',type:'subscription_activated',occurredAt:'2026-10-03T00:00:00Z'}));
  assert.equal(state.subscription.billingState,'active');
  state=applyPaymentEvent(state,normalized({eventId:'cancel',type:'subscription_canceled',occurredAt:'2026-10-04T00:00:00Z',paidThrough:'2026-11-01T00:00:00Z'}));
  assert.equal(state.subscription.billingState,'canceled');
  state=applyPaymentEvent(state,normalized({eventId:'expire',type:'subscription_expired',occurredAt:'2026-11-02T00:00:00Z'}));
  assert.equal(state.subscription.billingState,'expired');
});

test('reducer is provider neutral',()=>{
  const paypal=applyPaymentEvent(initial(),normalized({provider:'paypal',eventId:'p'}));
  const futureProvider=applyPaymentEvent(initial(),normalized({provider:'card-provider',eventId:'c'}));
  assert.equal(paypal.subscription.billingState,futureProvider.subscription.billingState);
  assert.equal(paypal.subscription.accessState,futureProvider.subscription.accessState);
});
