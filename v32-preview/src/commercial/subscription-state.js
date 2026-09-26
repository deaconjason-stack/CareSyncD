export const SUBSCRIPTION_STATES = Object.freeze([
  'registered_demo','active','payment_issue','canceled','expired'
]);

const EVENT_TYPES = new Set([
  'subscription_activated','payment_failed','subscription_canceled','subscription_expired','subscription_resubscribed'
]);

const clone = value => value == null ? value : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

function iso(value, field) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) throw new TypeError(`${field} must be a valid date`);
  return d.toISOString();
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function createDemoSubscription(accountId) {
  if (typeof accountId !== 'string' || !accountId.trim()) throw new TypeError('accountId is required');
  return Object.freeze({
    accountId:accountId.trim(),
    billingState:'registered_demo',
    accessState:'demo',
    provider:null,
    providerSubscriptionId:null,
    priceVersionId:null,
    grandfathered:false,
    paidThrough:null,
    graceUntil:null,
    lastEventId:null,
    lastEventAt:null
  });
}

function requireAllowedTransition(state, type) {
  const allowed = {
    registered_demo:new Set(['subscription_activated']),
    active:new Set(['payment_failed','subscription_canceled','subscription_expired']),
    payment_issue:new Set(['subscription_activated','subscription_canceled','subscription_expired','subscription_resubscribed']),
    canceled:new Set(['subscription_expired','subscription_resubscribed']),
    expired:new Set(['subscription_resubscribed','subscription_activated'])
  };
  if (!allowed[state.billingState]?.has(type)) throw new Error(`Invalid subscription transition: ${state.billingState} -> ${type}`);
}

export function reduceSubscription(current, event, { graceDays = 3 } = {}) {
  if (!current || !SUBSCRIPTION_STATES.includes(current.billingState)) throw new TypeError('current subscription state is invalid');
  if (!event || !EVENT_TYPES.has(event.type)) throw new TypeError('subscription event type is invalid');
  if (event.verified !== true) throw new Error('subscription event must be verified by the server');
  if (!Number.isInteger(graceDays) || graceDays < 0) throw new RangeError('graceDays must be a non-negative integer');
  const occurredAt = iso(event.occurredAt,'occurredAt');
  requireAllowedTransition(current,event.type);

  const next = {
    ...clone(current),
    provider:event.provider ?? current.provider ?? null,
    providerSubscriptionId:event.providerSubscriptionId ?? current.providerSubscriptionId ?? null,
    lastEventId:event.id ?? null,
    lastEventAt:occurredAt
  };

  if (event.type === 'subscription_activated' || event.type === 'subscription_resubscribed') {
    next.billingState = 'active';
    next.accessState = 'premium';
    next.graceUntil = null;
    next.paidThrough = event.paidThrough ? iso(event.paidThrough,'paidThrough') : next.paidThrough;
    if (event.priceVersionId) next.priceVersionId = event.priceVersionId;
    if (event.grandfathered === true) next.grandfathered = true;
  } else if (event.type === 'payment_failed') {
    next.billingState = 'payment_issue';
    next.accessState = 'premium';
    next.graceUntil = addDays(occurredAt,graceDays);
  } else if (event.type === 'subscription_canceled') {
    next.billingState = 'canceled';
    next.accessState = 'premium';
    next.paidThrough = iso(event.paidThrough,'paidThrough');
    next.graceUntil = null;
  } else if (event.type === 'subscription_expired') {
    next.billingState = 'expired';
    next.accessState = 'demo';
    next.graceUntil = null;
  }

  return Object.freeze(next);
}
