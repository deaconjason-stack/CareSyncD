const STAGE_TYPES = Object.freeze({
  demo:'demo_started',
  account:'account_created',
  checkout:'checkout_started',
  subscriber:'subscription_verified',
  activeLearner:'shift_started',
  renewal:'renewal'
});

const SUBSCRIBER_STATES = new Set(['active','payment_issue','canceled','expired']);
const DAY_MS = 24 * 60 * 60 * 1000;

function uniqueEvents(events = []) {
  const seen = new Set();
  const out = [];
  for (const event of Array.isArray(events) ? events : []) {
    if (!event?.id || seen.has(event.id)) continue;
    seen.add(event.id);
    out.push(event);
  }
  return out;
}

function identityKey(event) {
  return event?.anonymousId || event?.accountId || null;
}

function countBy(values) {
  const out = {};
  for (const value of values) {
    if (value == null || value === '') continue;
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

function validAsOf(asOf) {
  const ms = new Date(asOf).getTime();
  if (!asOf || Number.isNaN(ms)) throw new TypeError('asOf must be a valid date');
  return ms;
}

export function buildConversionFunnel(events = []) {
  const normalized = uniqueEvents(events);
  const visitor = new Set();
  const stages = Object.fromEntries(Object.keys(STAGE_TYPES).map(key => [key,new Set()]));
  for (const event of normalized) {
    const identity = identityKey(event);
    if (!identity) continue;
    visitor.add(identity);
    for (const [stage,type] of Object.entries(STAGE_TYPES)) {
      if (event.type === type) stages[stage].add(identity);
    }
  }
  return {
    visitor:visitor.size,
    demo:stages.demo.size,
    account:stages.account.size,
    checkout:stages.checkout.size,
    subscriber:stages.subscriber.size,
    activeLearner:stages.activeLearner.size,
    renewal:stages.renewal.size
  };
}

function summarizeSubscribers(subscriptions, asOfMs) {
  const identified = (Array.isArray(subscriptions) ? subscriptions : [])
    .filter(item => item?.accountId && SUBSCRIBER_STATES.has(item.billingState));
  const status = {active:0,paymentIssue:0,canceled:0,expired:0};
  for (const subscription of identified) {
    if (subscription.billingState === 'active') status.active++;
    else if (subscription.billingState === 'payment_issue') status.paymentIssue++;
    else if (subscription.billingState === 'canceled') status.canceled++;
    else if (subscription.billingState === 'expired') status.expired++;
  }
  const threshold = asOfMs - (30 * DAY_MS);
  const new30d = identified.filter(subscription => {
    const started = new Date(subscription.startedAt).getTime();
    return Number.isFinite(started) && started >= threshold && started <= asOfMs;
  }).length;
  return {
    total:identified.length,
    status,
    byPlan:countBy(identified.map(item => item.planId)),
    byCadence:countBy(identified.map(item => item.cadence)),
    new30d,
    identified:identified.map(item => ({
      accountId:item.accountId,
      displayName:item.displayName ?? null,
      email:item.email ?? null,
      planId:item.planId ?? null,
      cadence:item.cadence ?? null,
      billingState:item.billingState,
      accessState:item.accessState ?? null,
      startedAt:item.startedAt ?? null
    }))
  };
}

function acquisitionSummary(events) {
  return countBy(uniqueEvents(events)
    .filter(event => event.type === 'subscription_verified')
    .map(event => event.properties?.source)
    .filter(Boolean));
}

function learningSummary(events) {
  const normalized = uniqueEvents(events);
  const started = normalized.filter(event => event.type === 'shift_started');
  const completed = normalized.filter(event => event.type === 'shift_completed');
  const completedByUnit = countBy(completed.map(event => event.properties?.unitId));
  const ranked = Object.entries(completedByUnit)
    .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    shiftsStarted:started.length,
    shiftsCompleted:completed.length,
    topUnit:ranked[0]?.[0] ?? null,
    completedByUnit
  };
}

export function buildFounderSnapshot({analyticsEvents=[],subscriptions=[],learningEvents=[],asOf}={}) {
  const asOfMs = validAsOf(asOf);
  const subscriberSummary = summarizeSubscribers(subscriptions,asOfMs);
  return {
    asOf:new Date(asOfMs).toISOString(),
    funnel:buildConversionFunnel(analyticsEvents),
    subscribers:{
      total:subscriberSummary.total,
      status:{...subscriberSummary.status},
      byPlan:{...subscriberSummary.byPlan},
      byCadence:{...subscriberSummary.byCadence},
      new30d:subscriberSummary.new30d
    },
    identifiedSubscribers:subscriberSummary.identified.map(item => ({...item})),
    acquisition:acquisitionSummary(analyticsEvents),
    learning:learningSummary(learningEvents)
  };
}
