import test from 'node:test';
import assert from 'node:assert/strict';
import { createV32LivingHospitalSession } from '../../src/app/v32-living-hospital-session.js';
import { baseWorld, patientFixture, staffFixture } from './helpers.js';
import { buildV32PreviewRuntime } from '../../src/app/v32-preview-runtime.js';
import { createObservationSession, setInstructorConnection } from '../../src/instructor/live-session.js';
import {
  createOrganization, addOrganizationMember, createCohort, enrollLearner, visibleLearnerIdsForInstructor
} from '../../src/organizations/organization-engine.js';
import { createAnalyticsEvent } from '../../src/analytics/analytics-event.js';
import { listUnitDefinitions } from '../../src/living-hospital/unit-catalog.js';

const scopePolicy={canDelegate:(actionId,role)=>actionId==='vitals'&&role==='cna'};

function buildScenario(){
  const trajectory={
    initial:'watching',
    states:{
      watching:{criticalByMinute:1,critical:'critical-deterioration'},
      'critical-deterioration':{}
    }
  };
  return baseWorld({
    clock:{minute:0,running:true},
    units:{
      ed:{openBeds:0,staffReady:true},
      telemetry:{openBeds:0,staffReady:true},
      icu:{openBeds:0,staffReady:true}
    },
    patients:{
      p1:{
        id:'p1',unitId:'telemetry',pending:[],
        trajectory:{definition:trajectory,state:'watching',branch:'baseline'}
      },
      p2:{...patientFixture('p2'),unitId:'icu'}
    },
    staff:{'cna-1':staffFixture('cna-1')},
    tasks:{
      t1:{id:'t1',actionId:'vitals',status:'open',requiredTicks:1,progressTicks:0}
    },
    pressure:{used:0,limit:5}
  });
}

function executeRepresentativeChain(){
  const session=createV32LivingHospitalSession({state:buildScenario(),seed:41});

  assert.equal(session.scheduleEvent({
    id:'ed-surge',level:'hospital',pressureCost:1,prerequisites:[],cooldownKey:'ed-surge',cooldownMinutes:5
  }).accepted,true);
  assert.equal(session.scheduleEvent({
    id:'staff-calloff',level:'hospital',pressureCost:1,prerequisites:[],cooldownKey:'staff-calloff',cooldownMinutes:5
  }).accepted,true);

  let state=session.requestTransfer({patientId:'p1',toUnit:'icu',handoffReady:true,transportReady:true});
  assert.equal(state.units.telemetry.openBeds,0,'Telemetry starts full');
  assert.equal(state.transfers.p1.status,'waiting');
  assert.deepEqual(state.transfers.p1.blockers,['bed']);

  state=session.delegateTask({taskId:'t1',staffId:'cna-1',scopePolicy});
  assert.equal(state.tasks.t1.status,'delegated');

  session.recordCompetencyEvidence({
    domain:'operations',sourceEventId:'delegation-t1',minute:0,outcome:'met',weight:1
  });
  session.recordCompetencyEvidence({
    domain:'clinicalJudgment',sourceEventId:'deterioration-p1',minute:1,outcome:'partial',weight:1
  });

  state=session.markDischargeReady({patientId:'p2'});
  assert.equal(state.patients.p2.discharge.status,'ready');

  state=session.tick([]);
  assert.equal(state.clock.minute,1);
  assert.equal(state.patients.p1.trajectory.state,'critical-deterioration');
  assert.equal(state.tasks.t1.status,'complete');
  assert.equal(state.patients.p2.status,'discharged');
  assert.equal(state.patients.p1.unitId,'icu');
  assert.equal(state.transfers.p1.status,'complete');
  assert.equal(state.events.find(event=>event.id==='ed-surge').status,'active');
  assert.equal(state.events.find(event=>event.id==='staff-calloff').status,'active');

  const debrief=session.buildDebrief({label:'Phase 6 acceptance'});
  const kinds=debrief.timeline.map(item=>item.kind??item.type);
  for(const kind of [
    'EVENT_SCHEDULED','TRANSFER_REQUESTED','TASK_DELEGATED','DISCHARGE_READY',
    'CRITICAL_DETERIORATION','DELEGATED_TASK_COMPLETED','DISCHARGE_COMPLETED',
    'TRANSFER_COMPLETED','EVENT_ACTIVATED','TICK'
  ]) assert.ok(kinds.includes(kind),`debrief/replay should include ${kind}`);
  assert.equal(debrief.competencies.evidenceCount,2);
  assert.equal(debrief.summary.label,'Phase 6 acceptance');

  return {state,debrief};
}

test('representative Living Hospital chain executes end to end and reconstructs in debrief',()=>{
  const first=executeRepresentativeChain();
  const second=executeRepresentativeChain();
  assert.deepEqual(first,second,'fixed seed/state/actions should reproduce the same acceptance result');
});

test('commercial, organization, instructor and privacy boundaries remain intact after integration',()=>{
  const runtime=buildV32PreviewRuntime({
    now:'2026-09-25T20:00:00Z',online:true,backendConnected:false,
    browserPremium:true,
    entitlementSnapshot:{
      id:'spoof',accountId:'learner-1',planId:'individual',features:['living-hospital'],
      verifiedByServer:false,issuedAt:'2026-09-25T19:00:00Z',expiresAt:'2026-09-26T19:00:00Z'
    }
  });
  assert.equal(runtime.access.access,'demo','browser-forged premium remains blocked');
  assert.equal(runtime.units.length,6);
  assert.deepEqual(listUnitDefinitions().map(unit=>unit.id),['med-surg','ed','telemetry','icu','pediatrics','ob']);

  let org=createOrganization({id:'org-1',name:'Nursing School',seatLimit:2});
  org=addOrganizationMember(org,{accountId:'inst-1',role:'instructor'});
  org=addOrganizationMember(org,{accountId:'learner-1',role:'learner'});
  org=addOrganizationMember(org,{accountId:'learner-2',role:'learner'});
  org=createCohort(org,{id:'cohort-1',name:'Cohort A',instructorIds:['inst-1']});
  org=enrollLearner(org,{cohortId:'cohort-1',learnerId:'learner-1'});
  assert.deepEqual(visibleLearnerIdsForInstructor(org,'inst-1'),['learner-1']);

  const learnerWorld=buildScenario();
  let observation=createObservationSession({
    id:'obs-1',instructorId:'inst-1',learnerId:'learner-1',assignmentId:'a-1',observationEnabled:true,labMode:true
  });
  const before=structuredClone(learnerWorld);
  observation=setInstructorConnection(observation,'disconnected');
  assert.equal(observation.connectionStatus,'disconnected');
  assert.deepEqual(learnerWorld,before,'instructor disconnect must not mutate learner simulation state');

  assert.throws(()=>createAnalyticsEvent({
    id:'evt-1',type:'shift_started',occurredAt:'2026-09-25T20:00:00Z',anonymousId:'anon-1',
    properties:{patientName:'Real Patient Name'}
  }),/not allowed/i,'analytics must reject free-text/PHI-like fields');
});
