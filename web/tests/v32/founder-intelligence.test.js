import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsEvent, linkAnalyticsIdentity } from '../../src/analytics/analytics-event.js';
import { buildConversionFunnel, buildFounderSnapshot } from '../../src/admin/founder-intelligence.js';
import { buildFounderDashboardModel } from '../../src/ui/founder-dashboard-view-model.js';

function event(id,type,anonymousId,properties={},accountId=null,occurredAt='2026-09-20T12:00:00Z') {
  const base=createAnalyticsEvent({id,type,anonymousId,occurredAt,properties});
  return accountId ? linkAnalyticsIdentity(base,accountId) : base;
}

const events = () => [
  event('v1','page_view','anon-a',{page:'/'}),
  event('v2','pricing_view','anon-a',{page:'/pricing',source:'linkedin'}),
  event('d1','demo_started','anon-a',{source:'linkedin'}),
  event('a1','account_created','anon-a',{source:'linkedin'},'acct-a'),
  event('c1','checkout_started','anon-a',{planId:'individual',cadence:'monthly',source:'linkedin'},'acct-a'),
  event('s1','subscription_verified','anon-a',{planId:'individual',cadence:'monthly',source:'linkedin'},'acct-a'),
  event('ls1','shift_started','anon-a',{unitId:'med-surg',shiftFormat:'career'},'acct-a'),
  event('lc1','shift_completed','anon-a',{unitId:'med-surg',shiftFormat:'career'},'acct-a'),
  event('r1','renewal','anon-a',{planId:'individual',cadence:'monthly',source:'linkedin'},'acct-a','2026-09-24T12:00:00Z'),
  event('v3','page_view','anon-b',{page:'/pricing',source:'direct'}),
  event('d2','demo_started','anon-b',{source:'direct'}),
  event('ls2','shift_started','anon-b',{unitId:'icu',shiftFormat:'training'},null),
  event('lc2','shift_completed','anon-b',{unitId:'med-surg',shiftFormat:'training'},null),
  event('lc3','shift_completed','anon-a',{unitId:'med-surg',shiftFormat:'career'},'acct-a'),
  // duplicate ID must not double count even if an upstream collector retries
  event('lc3','shift_completed','anon-a',{unitId:'icu',shiftFormat:'career'},'acct-a')
];

test('conversion funnel counts unique visitor identities per stage and de-duplicates event ids', () => {
  const funnel=buildConversionFunnel(events());
  assert.deepEqual(funnel,{
    visitor:2,
    demo:2,
    account:1,
    checkout:1,
    subscriber:1,
    activeLearner:2,
    renewal:1
  });
});

test('Founder snapshot summarizes subscription status, plan, cadence, and recent starts', () => {
  const subscriptions=[
    {accountId:'acct-a',displayName:'A Learner',email:'a@example.com',planId:'individual',cadence:'monthly',billingState:'active',accessState:'premium',startedAt:'2026-09-20T00:00:00Z'},
    {accountId:'acct-b',displayName:'B Instructor',email:'b@example.com',planId:'instructor',cadence:'yearly',billingState:'payment_issue',accessState:'premium',startedAt:'2026-08-01T00:00:00Z'},
    {accountId:'acct-c',displayName:'C Learner',email:'c@example.com',planId:'individual',cadence:'monthly',billingState:'canceled',accessState:'premium',startedAt:'2026-07-01T00:00:00Z'},
    {accountId:'acct-d',displayName:'D School',email:'d@example.com',planId:'organization',cadence:'yearly',billingState:'expired',accessState:'demo',startedAt:'2026-06-01T00:00:00Z'}
  ];
  const snapshot=buildFounderSnapshot({analyticsEvents:events(),subscriptions,learningEvents:events(),asOf:'2026-09-25T00:00:00Z'});
  assert.deepEqual(snapshot.subscribers.status,{active:1,paymentIssue:1,canceled:1,expired:1});
  assert.deepEqual(snapshot.subscribers.byPlan,{individual:2,instructor:1,organization:1});
  assert.deepEqual(snapshot.subscribers.byCadence,{monthly:2,yearly:2});
  assert.equal(snapshot.subscribers.new30d,2);
  assert.equal(snapshot.subscribers.total,4);
});

test('acquisition attribution counts verified subscriptions rather than raw impressions', () => {
  const snapshot=buildFounderSnapshot({analyticsEvents:events(),subscriptions:[],learningEvents:[],asOf:'2026-09-25T00:00:00Z'});
  assert.deepEqual(snapshot.acquisition,{linkedin:1});
});

test('learning activity uses structured shift events and reports top unit', () => {
  const snapshot=buildFounderSnapshot({analyticsEvents:events(),subscriptions:[],learningEvents:events(),asOf:'2026-09-25T00:00:00Z'});
  assert.equal(snapshot.learning.shiftsStarted,2);
  assert.equal(snapshot.learning.shiftsCompleted,2);
  assert.equal(snapshot.learning.topUnit,'med-surg');
  assert.deepEqual(snapshot.learning.completedByUnit,{'med-surg':2});
});

test('dashboard model exposes only identified subscriber rows and never anonymous ids as people', () => {
  const subscriptions=[
    {accountId:'acct-a',displayName:'A Learner',email:'a@example.com',planId:'individual',cadence:'monthly',billingState:'active',accessState:'premium',startedAt:'2026-09-20T00:00:00Z'},
    {accountId:null,anonymousId:'anon-never-a-person',planId:null,cadence:null,billingState:'registered_demo',accessState:'demo',startedAt:'2026-09-21T00:00:00Z'}
  ];
  const snapshot=buildFounderSnapshot({analyticsEvents:events(),subscriptions,learningEvents:events(),asOf:'2026-09-25T00:00:00Z'});
  const model=buildFounderDashboardModel(snapshot);
  assert.equal(model.subscriberRows.length,1);
  assert.deepEqual(model.subscriberRows[0],{
    accountId:'acct-a',displayName:'A Learner',email:'a@example.com',planId:'individual',cadence:'monthly',status:'active'
  });
  assert.equal(JSON.stringify(model).includes('anon-never-a-person'),false);
});

test('Founder snapshot is deterministic for explicit asOf and does not mutate inputs', () => {
  const analytics=events();
  const subscriptions=[{accountId:'acct-a',planId:'individual',cadence:'monthly',billingState:'active',accessState:'premium',startedAt:'2026-09-20T00:00:00Z'}];
  const before=structuredClone({analytics,subscriptions});
  const one=buildFounderSnapshot({analyticsEvents:analytics,subscriptions,learningEvents:analytics,asOf:'2026-09-25T00:00:00Z'});
  const two=buildFounderSnapshot({analyticsEvents:analytics,subscriptions,learningEvents:analytics,asOf:'2026-09-25T00:00:00Z'});
  assert.deepEqual(one,two);
  assert.deepEqual({analytics,subscriptions},before);
});
