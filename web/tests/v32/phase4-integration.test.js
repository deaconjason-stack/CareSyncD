import test from 'node:test';
import assert from 'node:assert/strict';
import { createPriceVersion, classifyPricingChange } from '../../src/commercial/pricing-catalog.js';
import { createDemoSubscription } from '../../src/commercial/subscription-state.js';
import { normalizePaymentEvent, applyPaymentEvent } from '../../src/commercial/payment-events.js';
import { createEntitlementSnapshot, evaluateEntitlement } from '../../src/commercial/entitlement-engine.js';
import { mapPayPalWebhook } from '../../src/commercial/paypal-event-map.js';

test('Phase 4 commercial lifecycle is server-authoritative, idempotent, offline-safe, and resumable',()=>{
  const launchPrice=createPriceVersion({
    id:'launch-individual-monthly',planId:'individual',cadence:'monthly',amountCents:1000,
    entitlements:['living-hospital','career-progression'],effectiveAt:'2026-10-01T00:00:00Z'
  });
  const futurePrice=createPriceVersion({
    id:'future-individual-monthly',planId:'individual',cadence:'monthly',amountCents:1100,
    entitlements:['living-hospital','career-progression'],effectiveAt:'2026-11-01T00:00:00Z'
  });
  assert.equal(classifyPricingChange(launchPrice,futurePrice).major,true);

  let state={subscription:createDemoSubscription('acct-1'),processedEventIds:[],lastOccurredAt:null};
  assert.equal(state.subscription.accessState,'demo');

  const activation=mapPayPalWebhook({
    id:'WH-ACTIVE',event_type:'BILLING.SUBSCRIPTION.ACTIVATED',create_time:'2026-10-01T00:00:00Z',resource:{id:'P-1'}
  },{verificationStatus:'SUCCESS'});
  state=applyPaymentEvent(state,normalizePaymentEvent({...activation,eventId:activation.id,priceVersionId:launchPrice.id}));
  assert.equal(state.subscription.billingState,'active');
  assert.equal(state.subscription.accessState,'premium');
  assert.equal(state.subscription.priceVersionId,launchPrice.id);

  const entitlement=createEntitlementSnapshot({
    id:'ent-1',accountId:'acct-1',planId:'individual',features:launchPrice.entitlements,
    verifiedByServer:true,issuedAt:'2026-10-01T00:00:00Z',expiresAt:'2026-11-01T00:00:00Z'
  });
  assert.equal(evaluateEntitlement(entitlement,{now:'2026-10-05T12:00:00Z',offline:true,startingNewShift:true}).access,'premium');

  const spoof={...entitlement,verifiedByServer:false};
  assert.equal(evaluateEntitlement(spoof,{now:'2026-10-05T12:00:00Z',offline:false,startingNewShift:true}).access,'demo');

  const duplicate=applyPaymentEvent(state,normalizePaymentEvent({...activation,eventId:activation.id,priceVersionId:launchPrice.id}));
  assert.deepEqual(duplicate,state);

  const staleCancel=normalizePaymentEvent({
    provider:'paypal',eventId:'WH-STALE',type:'subscription_canceled',occurredAt:'2026-09-30T23:59:59Z',verified:true,
    providerSubscriptionId:'P-1',paidThrough:'2026-10-31T00:00:00Z'
  });
  state=applyPaymentEvent(state,staleCancel);
  assert.equal(state.subscription.billingState,'active');

  state=applyPaymentEvent(state,normalizePaymentEvent({
    provider:'paypal',eventId:'WH-FAIL',type:'payment_failed',occurredAt:'2026-10-10T00:00:00Z',verified:true,providerSubscriptionId:'P-1'
  }));
  assert.equal(state.subscription.billingState,'payment_issue');
  assert.equal(state.subscription.accessState,'premium');
  assert.equal(state.subscription.graceUntil,'2026-10-13T00:00:00.000Z');

  state=applyPaymentEvent(state,normalizePaymentEvent({
    provider:'paypal',eventId:'WH-CANCEL',type:'subscription_canceled',occurredAt:'2026-10-11T00:00:00Z',verified:true,
    providerSubscriptionId:'P-1',paidThrough:'2026-11-01T00:00:00Z'
  }));
  assert.equal(state.subscription.billingState,'canceled');
  assert.equal(state.subscription.accessState,'premium');

  state=applyPaymentEvent(state,normalizePaymentEvent({
    provider:'paypal',eventId:'WH-EXPIRE',type:'subscription_expired',occurredAt:'2026-11-02T00:00:00Z',verified:true,providerSubscriptionId:'P-1'
  }));
  assert.equal(state.subscription.billingState,'expired');
  assert.equal(state.subscription.accessState,'demo');
  assert.equal(state.subscription.priceVersionId,launchPrice.id);

  state=applyPaymentEvent(state,normalizePaymentEvent({
    provider:'paypal',eventId:'WH-RETURN',type:'subscription_resubscribed',occurredAt:'2026-12-01T00:00:00Z',verified:true,
    providerSubscriptionId:'P-2'
  }));
  assert.equal(state.subscription.billingState,'active');
  assert.equal(state.subscription.accessState,'premium');
  assert.equal(state.subscription.priceVersionId,launchPrice.id);

  const oldEntitlementAfterSevenDays=evaluateEntitlement(entitlement,{now:'2026-10-08T00:00:00.001Z',offline:true,startingNewShift:true});
  assert.equal(oldEntitlementAfterSevenDays.access,'demo');

  const finishExisting=evaluateEntitlement(entitlement,{
    now:'2026-11-02T00:00:00Z',offline:true,startingNewShift:false,activeShiftStartedAt:'2026-10-05T00:00:00Z'
  });
  assert.equal(finishExisting.access,'finish-active-only');
});
