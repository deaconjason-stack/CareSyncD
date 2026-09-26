export const PLAN_IDS = Object.freeze(['individual','instructor','organization']);
export const BILLING_CADENCES = Object.freeze(['monthly','yearly']);

const PLAN_SET = new Set(PLAN_IDS);
const CADENCE_SET = new Set(BILLING_CADENCES);

function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function normalizeSet(values, field) {
  if (!Array.isArray(values)) throw new TypeError(`${field} must be an array`);
  const result = [...new Set(values.map(value => requireString(value, field)))].sort();
  return Object.freeze(result);
}

function equalSets(a = [], b = []) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

export function createPriceVersion({
  id,
  planId,
  cadence,
  amountCents,
  promotionPercent = 0,
  grandfatherExisting = true,
  entitlements = [],
  activeCadences = BILLING_CADENCES,
  effectiveAt
} = {}) {
  id = requireString(id, 'id');
  if (!PLAN_SET.has(planId)) throw new RangeError(`Unknown plan: ${planId}`);
  if (!CADENCE_SET.has(cadence)) throw new RangeError(`Unknown billing cadence: ${cadence}`);
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new RangeError('amountCents must be non-negative integer cents');
  if (!Number.isFinite(promotionPercent) || promotionPercent < 0 || promotionPercent > 100) throw new RangeError('promotionPercent must be between 0 and 100');
  const effectiveDate = new Date(effectiveAt);
  if (!effectiveAt || Number.isNaN(effectiveDate.getTime())) throw new TypeError('effectiveAt must be a valid date');

  const normalizedCadences = normalizeSet(activeCadences, 'activeCadences');
  if (!normalizedCadences.every(value => CADENCE_SET.has(value))) throw new RangeError('activeCadences contains an unknown billing cadence');

  return Object.freeze({
    id,
    planId,
    cadence,
    amountCents,
    promotionPercent,
    grandfatherExisting:Boolean(grandfatherExisting),
    entitlements:normalizeSet(entitlements, 'entitlements'),
    activeCadences:normalizedCadences,
    effectiveAt:effectiveDate.toISOString()
  });
}

export function classifyPricingChange(previous, next) {
  if (!previous || !next) throw new TypeError('previous and next price versions are required');
  const reasons = [];

  if (previous.amountCents !== next.amountCents) {
    const percent = previous.amountCents === 0
      ? Infinity
      : Math.abs(next.amountCents - previous.amountCents) / previous.amountCents * 100;
    if (percent >= 10) reasons.push('base-price-change-10-percent-or-more');
  }

  if (Number(next.promotionPercent ?? 0) > 25) reasons.push('promotion-over-25-percent');
  if (previous.grandfatherExisting !== false && next.grandfatherExisting === false) reasons.push('grandfathering-removed');

  const previousCadences = previous.activeCadences ?? BILLING_CADENCES;
  const nextCadences = next.activeCadences ?? BILLING_CADENCES;
  if (previousCadences.some(cadence => !nextCadences.includes(cadence))) reasons.push('billing-cadence-removed');

  if (!equalSets(previous.entitlements ?? [], next.entitlements ?? [])) reasons.push('material-entitlement-change');

  return { major:reasons.length > 0, reasons };
}
