import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPayPalWebhook } from '../../src/commercial/paypal-event-map.js';

const payload = (eventType, overrides={}) => ({
  id:`WH-${eventType}`,
  event_type:eventType,
  create_time:'2026-10-01T12:00:00.000Z',
  resource:{ id:'P-SUB-1', ...overrides.resource },
  ...overrides
});

const verified={verificationStatus:'SUCCESS'};

test('verified PayPal activation maps to provider-neutral activation event',()=>{
  const event=mapPayPalWebhook(payload('BILLING.SUBSCRIPTION.ACTIVATED'),verified);
  assert.equal(event.provider,'paypal');
  assert.equal(event.id,'WH-BILLING.SUBSCRIPTION.ACTIVATED');
  assert.equal(event.type,'subscription_activated');
  assert.equal(event.providerSubscriptionId,'P-SUB-1');
  assert.equal(event.verified,true);
});

test('failed or missing verification is rejected before mapping',()=>{
  assert.throws(()=>mapPayPalWebhook(payload('BILLING.SUBSCRIPTION.ACTIVATED'),{verificationStatus:'FAILURE'}),/verification/i);
  assert.throws(()=>mapPayPalWebhook(payload('BILLING.SUBSCRIPTION.ACTIVATED')),/verification/i);
});

test('subscription cancellation maps with paid-through date when supplied',()=>{
  const event=mapPayPalWebhook(payload('BILLING.SUBSCRIPTION.CANCELLED',{resource:{id:'P-SUB-1',billing_info:{next_billing_time:'2026-11-01T00:00:00Z'}}}),verified);
  assert.equal(event.type,'subscription_canceled');
  assert.equal(event.paidThrough,'2026-11-01T00:00:00Z');
});

test('suspension and denied payment map to payment_failed',()=>{
  assert.equal(mapPayPalWebhook(payload('BILLING.SUBSCRIPTION.SUSPENDED'),verified).type,'payment_failed');
  assert.equal(mapPayPalWebhook(payload('PAYMENT.SALE.DENIED'),verified).type,'payment_failed');
});

test('subscription expiration maps to expired',()=>{
  assert.equal(mapPayPalWebhook(payload('BILLING.SUBSCRIPTION.EXPIRED'),verified).type,'subscription_expired');
});

test('event id and occurrence time are preserved exactly for idempotency ordering',()=>{
  const event=mapPayPalWebhook({...payload('BILLING.SUBSCRIPTION.ACTIVATED'),id:'WH-ABC',create_time:'2026-10-02T01:02:03Z'},verified);
  assert.equal(event.id,'WH-ABC');
  assert.equal(event.occurredAt,'2026-10-02T01:02:03Z');
});

test('unsupported PayPal event types do not silently mutate subscriptions',()=>{
  assert.throws(()=>mapPayPalWebhook(payload('CUSTOMER.DISPUTE.CREATED'),verified),/unsupported/i);
});
