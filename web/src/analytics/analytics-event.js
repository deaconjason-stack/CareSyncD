export const ANALYTICS_EVENT_TYPES = Object.freeze([
  'page_view','pricing_view','demo_started','account_created','checkout_started',
  'subscription_verified','shift_started','shift_completed','renewal'
]);

const TYPE_SET = new Set(ANALYTICS_EVENT_TYPES);
const ALLOWED_PROPERTIES = new Set([
  'page','referrerHost','deviceClass','browserFamily','regionCode','planId','cadence','source','unitId','shiftFormat'
]);

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalAccountId(value) {
  if (value == null) return null;
  return requiredString(value,'accountId');
}

function normalizeTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new TypeError('occurredAt must be a valid date');
  return date.toISOString();
}

function normalizeProperty(key, value) {
  if (value == null) return null;
  if (!['string','number','boolean'].includes(typeof value)) {
    throw new TypeError(`Analytics property ${key} must be a structured scalar`);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`Analytics property ${key} must be finite`);
  }
  if (typeof value !== 'string') return value;
  const normalized = value.trim().slice(0,160);
  if (key === 'page') return normalized.split(/[?#]/,1)[0] || '/';
  if (key === 'referrerHost') return normalized.toLowerCase();
  return normalized;
}

function normalizeProperties(properties = {}) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new TypeError('Analytics properties must be an object');
  }
  const result = {};
  for (const [key,value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTIES.has(key)) throw new Error(`Analytics property not allowed: ${key}`);
    result[key] = normalizeProperty(key,value);
  }
  return Object.freeze(result);
}

export function createAnalyticsEvent({id,type,occurredAt,anonymousId,accountId=null,properties={}}={}) {
  id = requiredString(id,'id');
  type = requiredString(type,'event type');
  if (!TYPE_SET.has(type)) throw new RangeError(`Unsupported analytics event type: ${type}`);
  anonymousId = requiredString(anonymousId,'anonymousId');
  return Object.freeze({
    id,
    type,
    occurredAt:normalizeTime(occurredAt),
    anonymousId,
    accountId:optionalAccountId(accountId),
    properties:normalizeProperties(properties)
  });
}

export function linkAnalyticsIdentity(event, accountId) {
  if (!event || typeof event !== 'object') throw new TypeError('analytics event is required');
  accountId = requiredString(accountId,'accountId');
  return createAnalyticsEvent({
    id:event.id,
    type:event.type,
    occurredAt:event.occurredAt,
    anonymousId:event.anonymousId,
    accountId,
    properties:event.properties ?? {}
  });
}
