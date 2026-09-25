import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_IDS,
  BILLING_CADENCES,
  createPriceVersion,
  classifyPricingChange
} from '../../src/commercial/pricing-catalog.js';

test('commercial catalog exposes exactly the approved plans and billing cadences', () => {
  assert.deepEqual([...PLAN_IDS], ['individual','instructor','organization']);
  assert.deepEqual([...BILLING_CADENCES], ['monthly','yearly']);
});

test('price versions use integer cents, are immutable, and preserve grandfathering by default', () => {
  const price = createPriceVersion({
    id:'individual-launch-monthly',
    planId:'individual',
    cadence:'monthly',
    amountCents:1000,
    entitlements:['living-hospital','career-progression'],
    effectiveAt:'2026-10-01T00:00:00.000Z'
  });
  assert.equal(price.amountCents,1000);
  assert.equal(price.grandfatherExisting,true);
  assert.ok(Object.isFrozen(price));
  assert.ok(Object.isFrozen(price.entitlements));
  assert.throws(() => createPriceVersion({id:'bad',planId:'individual',cadence:'monthly',amountCents:10.5,entitlements:[],effectiveAt:'2026-10-01'}), /integer cents/i);
  assert.throws(() => createPriceVersion({id:'bad',planId:'unknown',cadence:'monthly',amountCents:100,entitlements:[],effectiveAt:'2026-10-01'}), /plan/i);
});

test('exactly ten percent base-price change requires Founder approval', () => {
  const previous = createPriceVersion({id:'v1',planId:'individual',cadence:'monthly',amountCents:1000,entitlements:['a'],effectiveAt:'2026-10-01'});
  const next = createPriceVersion({id:'v2',planId:'individual',cadence:'monthly',amountCents:1100,entitlements:['a'],effectiveAt:'2026-11-01'});
  const result = classifyPricingChange(previous,next);
  assert.equal(result.major,true);
  assert.ok(result.reasons.includes('base-price-change-10-percent-or-more'));
});

test('small base-price change remains ordinary when no other major rule changes', () => {
  const previous = createPriceVersion({id:'v1',planId:'individual',cadence:'monthly',amountCents:1000,entitlements:['a'],effectiveAt:'2026-10-01'});
  const next = createPriceVersion({id:'v2',planId:'individual',cadence:'monthly',amountCents:1099,entitlements:['a'],effectiveAt:'2026-11-01'});
  assert.deepEqual(classifyPricingChange(previous,next),{major:false,reasons:[]});
});

test('promotion greater than twenty-five percent requires Founder approval', () => {
  const previous = createPriceVersion({id:'v1',planId:'instructor',cadence:'yearly',amountCents:12000,entitlements:['a'],effectiveAt:'2026-10-01'});
  const next = createPriceVersion({id:'v2',planId:'instructor',cadence:'yearly',amountCents:12000,promotionPercent:26,entitlements:['a'],effectiveAt:'2026-11-01'});
  const result = classifyPricingChange(previous,next);
  assert.equal(result.major,true);
  assert.ok(result.reasons.includes('promotion-over-25-percent'));
});

test('grandfathering removal, cadence removal, or entitlement movement is major', () => {
  const previous = createPriceVersion({id:'v1',planId:'organization',cadence:'yearly',amountCents:50000,entitlements:['cohorts','reports'],effectiveAt:'2026-10-01'});
  const noGrandfather = createPriceVersion({id:'v2',planId:'organization',cadence:'yearly',amountCents:50000,grandfatherExisting:false,entitlements:['cohorts','reports'],effectiveAt:'2026-11-01'});
  assert.ok(classifyPricingChange(previous,noGrandfather).reasons.includes('grandfathering-removed'));

  const cadenceRemoved = {...noGrandfather, grandfatherExisting:true, activeCadences:['yearly']};
  const priorCadences = {...previous, activeCadences:['monthly','yearly']};
  assert.ok(classifyPricingChange(priorCadences,cadenceRemoved).reasons.includes('billing-cadence-removed'));

  const moved = createPriceVersion({id:'v3',planId:'organization',cadence:'yearly',amountCents:50000,entitlements:['cohorts'],effectiveAt:'2026-12-01'});
  assert.ok(classifyPricingChange(previous,moved).reasons.includes('material-entitlement-change'));
});

test('entitlement ordering alone does not create a major change', () => {
  const previous = createPriceVersion({id:'v1',planId:'individual',cadence:'monthly',amountCents:1000,entitlements:['a','b'],effectiveAt:'2026-10-01'});
  const next = createPriceVersion({id:'v2',planId:'individual',cadence:'monthly',amountCents:1000,entitlements:['b','a'],effectiveAt:'2026-11-01'});
  assert.deepEqual(classifyPricingChange(previous,next),{major:false,reasons:[]});
});
