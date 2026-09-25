import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUBSCRIPTION_STATES,
  createDemoSubscription,
  reduceSubscription
} from '../../src/commercial/subscription-state.js';

const event = (type, overrides = {}) => ({
  id:`evt-${type}`,
  type,
  occurredAt:'2026-10-01T12:00:00.000Z',
  verified:true,
  provider:'paypal',
  providerSubscriptionId:'P-1',
  ...overrides
});

test('new account starts as registered demo with demo access', () => {
  const state = createDemoSubscription('acct-1');
  assert.equal(state.accountId,'acct-1');
  assert.equal(state.billingState,'registered_demo');
  assert.equal(state.accessState,'demo');
  assert.equal(state.grandfathered,false);
  assert.ok(SUBSCRIPTION_STATES.includes('active'));
});

test('verified activation grants premium and records price version', () => {
  const state = reduceSubscription(createDemoSubscription('acct-1'), event('subscription_activated',{priceVersionId:'individual-launch'}));
  assert.equal(state.billingState,'active');
  assert.equal(state.accessState,'premium');
  assert.equal(state.priceVersionId,'individual-launch');
  assert.equal(state.providerSubscriptionId,'P-1');
});

test('payment failure enters three-day grace by default', () => {
  const active = reduceSubscription(createDemoSubscription('acct-1'), event('subscription_activated',{priceVersionId:'v1'}));
  const failed = reduceSubscription(active,event('payment_failed',{occurredAt:'2026-10-02T00:00:00.000Z'}));
  assert.equal(failed.billingState,'payment_issue');
  assert.equal(failed.accessState,'premium');
  assert.equal(failed.graceUntil,'2026-10-05T00:00:00.000Z');
});

test('cancellation preserves premium through paid-through date', () => {
  const active = reduceSubscription(createDemoSubscription('acct-1'), event('subscription_activated',{priceVersionId:'v1'}));
  const canceled = reduceSubscription(active,event('subscription_canceled',{paidThrough:'2026-11-01T00:00:00.000Z'}));
  assert.equal(canceled.billingState,'canceled');
  assert.equal(canceled.accessState,'premium');
  assert.equal(canceled.paidThrough,'2026-11-01T00:00:00.000Z');
});

test('expiration removes premium but preserves price history and account', () => {
  const active = reduceSubscription(createDemoSubscription('acct-1'), event('subscription_activated',{priceVersionId:'launch-v1'}));
  const expired = reduceSubscription(active,event('subscription_expired',{occurredAt:'2026-11-02T00:00:00.000Z'}));
  assert.equal(expired.accountId,'acct-1');
  assert.equal(expired.billingState,'expired');
  assert.equal(expired.accessState,'demo');
  assert.equal(expired.priceVersionId,'launch-v1');
});

test('resubscription restores premium without resetting grandfather history', () => {
  let state = reduceSubscription(createDemoSubscription('acct-1'),event('subscription_activated',{priceVersionId:'launch-v1',grandfathered:true}));
  state = reduceSubscription(state,event('subscription_expired',{occurredAt:'2026-11-02T00:00:00.000Z'}));
  state = reduceSubscription(state,event('subscription_resubscribed',{occurredAt:'2026-12-01T00:00:00.000Z'}));
  assert.equal(state.billingState,'active');
  assert.equal(state.accessState,'premium');
  assert.equal(state.grandfathered,true);
  assert.equal(state.priceVersionId,'launch-v1');
});

test('unverified event cannot change subscription authority', () => {
  const demo = createDemoSubscription('acct-1');
  assert.throws(() => reduceSubscription(demo,event('subscription_activated',{verified:false})),/verified/i);
});

test('invalid transitions and malformed paid-through dates are rejected', () => {
  const demo = createDemoSubscription('acct-1');
  assert.throws(() => reduceSubscription(demo,event('payment_failed')),/transition/i);
  const active = reduceSubscription(demo,event('subscription_activated',{priceVersionId:'v1'}));
  assert.throws(() => reduceSubscription(active,event('subscription_canceled',{paidThrough:'bad'})),/paidThrough/i);
});
