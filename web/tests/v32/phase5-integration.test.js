import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsEvent, linkAnalyticsIdentity } from '../../src/analytics/analytics-event.js';
import { buildConversionFunnel, buildFounderSnapshot } from '../../src/admin/founder-intelligence.js';
import { buildFounderDashboardModel } from '../../src/ui/founder-dashboard-view-model.js';
import { createPriceVersion } from '../../src/commercial/pricing-catalog.js';
import { evaluateAdminAction } from '../../src/admin/admin-policy.js';
import {
  createOrganization, addOrganizationMember, createCohort, enrollLearner,
  createAssignment, visibleLearnerIdsForInstructor
} from '../../src/organizations/organization-engine.js';
import { createWorldState } from '../../src/living-hospital/world-state.js';
import {
  createObservationSession, setInstructorConnection, appendObservationFrame,
  framesAfter, injectLabEvent
} from '../../src/instructor/live-session.js';

function analytics(id,type,anonymousId,properties={},accountId=null,occurredAt='2026-09-25T14:00:00Z'){
  const event=createAnalyticsEvent({id,type,anonymousId,properties,occurredAt});
  return accountId?linkAnalyticsIdentity(event,accountId):event;
}

test('Phase 5 acceptance: anonymous acquisition becomes identified only by explicit linkage and appears in Founder intelligence',()=>{
  const anonymousId='anon-phase5';
  const events=[
    analytics('v1','page_view',anonymousId,{page:'/',source:'linkedin'}),
    analytics('p1','pricing_view',anonymousId,{page:'/pricing',source:'linkedin'}),
    analytics('d1','demo_started',anonymousId,{source:'linkedin'}),
    analytics('a1','account_created',anonymousId,{source:'linkedin'},'acct-learner'),
    analytics('c1','checkout_started',anonymousId,{planId:'individual',cadence:'monthly',source:'linkedin'},'acct-learner'),
    analytics('s1','subscription_verified',anonymousId,{planId:'individual',cadence:'monthly',source:'linkedin'},'acct-learner'),
    analytics('sh1','shift_started',anonymousId,{unitId:'med-surg',shiftFormat:'career'},'acct-learner'),
    analytics('sh2','shift_completed',anonymousId,{unitId:'med-surg',shiftFormat:'career'},'acct-learner')
  ];

  assert.equal(events[0].accountId,null);
  assert.deepEqual(buildConversionFunnel(events),{
    visitor:1,demo:1,account:1,checkout:1,subscriber:1,activeLearner:1,renewal:0
  });

  const snapshot=buildFounderSnapshot({
    analyticsEvents:events,
    subscriptions:[{
      accountId:'acct-learner',displayName:'Learner One',email:'learner@example.com',
      planId:'individual',cadence:'monthly',billingState:'active',accessState:'premium',
      startedAt:'2026-09-25T14:05:00Z'
    }],
    learningEvents:events,
    asOf:'2026-09-25T16:00:00Z'
  });
  const dashboard=buildFounderDashboardModel(snapshot);
  assert.deepEqual(snapshot.acquisition,{linkedin:1});
  assert.equal(dashboard.subscriberRows.length,1);
  assert.equal(dashboard.subscriberRows[0].accountId,'acct-learner');
  assert.equal(JSON.stringify(dashboard).includes(anonymousId),false);
});

test('Phase 5 acceptance: organization seats, cohort scoping and assignments restrict instructor visibility',()=>{
  let org=createOrganization({id:'org-school',name:'CareSyncD School',seatLimit:2});
  org=addOrganizationMember(org,{accountId:'admin-school',role:'organization_admin'});
  org=addOrganizationMember(org,{accountId:'inst-a',role:'instructor'});
  org=addOrganizationMember(org,{accountId:'inst-b',role:'instructor'});
  org=addOrganizationMember(org,{accountId:'learner-a',role:'learner'});
  org=addOrganizationMember(org,{accountId:'learner-b',role:'learner'});
  org=createCohort(org,{id:'cohort-a',name:'Med-Surg A',instructorIds:['inst-a']});
  org=createCohort(org,{id:'cohort-b',name:'ICU B',instructorIds:['inst-b']});
  org=enrollLearner(org,{cohortId:'cohort-a',learnerId:'learner-a'});
  org=enrollLearner(org,{cohortId:'cohort-b',learnerId:'learner-b'});
  org=createAssignment(org,{
    id:'assign-a',cohortId:'cohort-a',title:'Prioritization',unitId:'med-surg',difficulty:'standard',
    dueAt:'2026-10-15T23:59:00Z',requiredCompetencies:{clinicalJudgment:75,operations:70},minimumCompletedShifts:1
  });
  assert.deepEqual(visibleLearnerIdsForInstructor(org,'inst-a'),['learner-a']);
  assert.deepEqual(visibleLearnerIdsForInstructor(org,'inst-b'),['learner-b']);
  assert.equal(org.assignments['assign-a'].unitId,'med-surg');
});

test('Phase 5 acceptance: observed session is disclosed, disconnect-safe, catch-up capable, and lab injection is audited',()=>{
  const originalWorld=createWorldState({seed:55,difficulty:'standard',shiftFormat:'career'});
  const baseline=structuredClone(originalWorld);
  let session=createObservationSession({
    id:'obs-a',instructorId:'inst-a',learnerId:'learner-a',assignmentId:'assign-a',observationEnabled:true,labMode:true
  });
  assert.equal(session.learnerDisclosure.label,'Instructor Observation Active');

  session=appendObservationFrame(session,{sequence:1,minute:0,type:'shift-start',payload:{unitId:'med-surg'}});
  session=setInstructorConnection(session,'disconnected');
  assert.deepEqual(originalWorld,baseline);
  session=appendObservationFrame(session,{sequence:2,minute:5,type:'learner-action',payload:{actionId:'assess'}});
  session=appendObservationFrame(session,{sequence:3,minute:7,type:'unit-event',payload:{eventId:'call-light'}});
  session=setInstructorConnection(session,'connected');
  assert.deepEqual(framesAfter(session,1).map(frame=>frame.sequence),[2,3]);

  const injection=injectLabEvent(originalWorld,session,{
    id:'instructor-staff-calloff',level:'unit',pressureCost:2,prerequisites:[],
    cooldownKey:'instructor-staff-calloff',cooldownMinutes:5
  });
  assert.equal(injection.accepted,true);
  assert.deepEqual(originalWorld,baseline);
  assert.ok(injection.world.timeline.some(item=>item.kind==='EVENT_SCHEDULED'&&item.eventId==='instructor-staff-calloff'));
  assert.ok(injection.world.timeline.some(item=>item.kind==='INSTRUCTOR_LAB_INJECTION'&&item.sessionId==='obs-a'));
});

test('Phase 5 acceptance: analytics rejects PHI-like/free-text payloads before Founder analytics',()=>{
  for(const properties of [
    {page:'/hospital',patientId:'resident-1'},
    {page:'/hospital',note:'free clinical note'},
    {page:'/hospital',freeText:'patient looks worse'},
    {page:'/hospital',diagnosis:'example diagnosis'}
  ]){
    assert.throws(()=>analytics('bad-'+Object.keys(properties).at(-1),'shift_completed','anon-bad',properties),/analytics property|not allowed/i);
  }
});

test('Phase 5 acceptance: Admin can run ordinary operations but exact ten percent price change routes to Founder',()=>{
  assert.deepEqual(evaluateAdminAction({actorRole:'admin',action:'manage_organization'}),{
    allowed:true,requiresFounderApproval:false,reasons:[]
  });
  const previous=createPriceVersion({
    id:'price-1',planId:'individual',cadence:'monthly',amountCents:1000,
    entitlements:['living-hospital'],effectiveAt:'2026-10-01T00:00:00Z'
  });
  const next=createPriceVersion({
    id:'price-2',planId:'individual',cadence:'monthly',amountCents:1100,
    entitlements:['living-hospital'],effectiveAt:'2026-11-01T00:00:00Z'
  });
  const decision=evaluateAdminAction({actorRole:'admin',action:'propose_pricing_change',previousPrice:previous,nextPrice:next});
  assert.equal(decision.allowed,true);
  assert.equal(decision.requiresFounderApproval,true);
  assert.ok(decision.reasons.includes('base-price-change-10-percent-or-more'));
});
