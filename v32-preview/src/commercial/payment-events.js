import { reduceSubscription } from './subscription-state.js';

function iso(value, field) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) throw new TypeError(`${field} must be a valid date`);
  return d.toISOString();
}

export function normalizePaymentEvent(input = {}) {
  if (typeof input.provider !== 'string' || !input.provider.trim()) throw new TypeError('provider is required');
  if (typeof input.eventId !== 'string' || !input.eventId.trim()) throw new TypeError('eventId is required');
  if (typeof input.type !== 'string' || !input.type.trim()) throw new TypeError('type is required');

  return Object.freeze({
    id: input.eventId.trim(),
    provider: input.provider.trim(),
    type: input.type.trim(),
    occurredAt: iso(input.occurredAt, 'occurredAt'),
    verified: input.verified === true,
    providerSubscriptionId: input.providerSubscriptionId ?? null,
    priceVersionId: input.priceVersionId ?? null,
    paidThrough: input.paidThrough ?? null,
    grandfathered: input.grandfathered === true
  });
}

export function applyPaymentEvent(state, event) {
  if (!state || !state.subscription || !Array.isArray(state.processedEventIds)) {
    throw new TypeError('payment reducer state is invalid');
  }
  if (!event || event.verified !== true) throw new Error('Payment event must be verified');
  if (!event.id) throw new TypeError('Payment event id is required');

  if (state.processedEventIds.includes(event.id)) return state;

  const occurredAt = iso(event.occurredAt, 'occurredAt');
  if (state.lastOccurredAt) {
    const previousTime = new Date(state.lastOccurredAt).getTime();
    const currentTime = new Date(occurredAt).getTime();
    if (currentTime < previousTime) return state;
  }

  const subscription = reduceSubscription(state.subscription, event);
  return Object.freeze({
    subscription,
    processedEventIds: Object.freeze([...state.processedEventIds, event.id]),
    lastOccurredAt: occurredAt
  });
}
