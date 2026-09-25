import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldState } from '../../src/living-hospital/world-state.js';
import {
  createObservationSession,
  setInstructorConnection,
  appendObservationFrame,
  framesAfter,
  addInstructorNote,
  injectLabEvent
} from '../../src/instructor/live-session.js';

const sessionInput=(overrides={})=>({
  id:'obs-1',instructorId:'inst-1',learnerId:'learner-1',assignmentId:'assign-1',
  observationEnabled:true,labMode:false,...overrides
});

const event=(overrides={})=>({
  id:'lab-calloff',level:'unit',pressureCost:2,prerequisites:[],cooldownKey:'staff-calloff',cooldownMinutes:5,
  ...overrides
});

test('observation is off unless explicitly enabled and disabled sessions cannot consume live frames',()=>{
  const session=createObservationSession(sessionInput({observationEnabled:false}));
  assert.equal(session.learnerDisclosure.observationActive,false);
  assert.throws(()=>appendObservationFrame(session,{sequence:1,minute:0,type:'clock'}),/observation.*disabled/i);
  assert.throws(()=>framesAfter(session,0),/observation.*disabled/i);
});

test('enabled observation is explicitly disclosed to the learner',()=>{
  const session=createObservationSession(sessionInput());
  assert.deepEqual(session.learnerDisclosure,{observationActive:true,label:'Instructor Observation Active'});
  assert.equal(session.connectionStatus,'connected');
});

test('frames require increasing sequence and reconnect catch-up returns only missed frames',()=>{
  let session=createObservationSession(sessionInput());
  session=appendObservationFrame(session,{sequence:1,minute:0,type:'shift-start',payload:{unitId:'med-surg'}});
  session=appendObservationFrame(session,{sequence:2,minute:4,type:'learner-action',payload:{actionId:'assess'}});
  assert.throws(()=>appendObservationFrame(session,{sequence:2,minute:5,type:'duplicate'}),/sequence/i);
  session=setInstructorConnection(session,'disconnected');
  session=appendObservationFrame(session,{sequence:3,minute:8,type:'unit-event',payload:{eventId:'surge'}});
  session=setInstructorConnection(session,'connected');
  const missed=framesAfter(session,1);
  assert.deepEqual(missed.map(frame=>frame.sequence),[2,3]);
});

test('instructor disconnect changes transport state only and never mutates learner world',()=>{
  const world=createWorldState({seed:42,difficulty:'standard',shiftFormat:'career'});
  const before=structuredClone(world);
  const session=createObservationSession(sessionInput());
  const disconnected=setInstructorConnection(session,'disconnected');
  assert.equal(disconnected.connectionStatus,'disconnected');
  assert.deepEqual(world,before);
});

test('private instructor notes are timestamped and empty notes are rejected',()=>{
  let session=createObservationSession(sessionInput());
  session=addInstructorNote(session,{minute:12,text:'Review prioritization and reassessment timing.'});
  assert.deepEqual(session.notes,[{minute:12,text:'Review prioritization and reassessment timing.',private:true}]);
  assert.throws(()=>addInstructorNote(session,{minute:13,text:'  '}),/note/i);
});

test('Simulation Lab injection requires explicit lab mode',()=>{
  const world=createWorldState({seed:1,difficulty:'standard',shiftFormat:'career'});
  const normal=createObservationSession(sessionInput({labMode:false}));
  assert.throws(()=>injectLabEvent(world,normal,event()),/lab mode/i);
});

test('Simulation Lab injection respects the existing pressure budget instead of forcing events',()=>{
  const world=createWorldState({seed:1,difficulty:'guided',shiftFormat:'training'});
  const lab=createObservationSession(sessionInput({labMode:true}));
  const result=injectLabEvent(world,lab,event({id:'too-much',pressureCost:4,cooldownKey:'too-much'}));
  assert.equal(result.accepted,false);
  assert.equal(result.reason,'pressure-budget');
  assert.deepEqual(result.world,world);
});

test('successful Simulation Lab injection is scheduled through the Living Hospital event engine and audited in timeline',()=>{
  const world=createWorldState({seed:1,difficulty:'standard',shiftFormat:'career'});
  const lab=createObservationSession(sessionInput({labMode:true}));
  const result=injectLabEvent(world,lab,event());
  assert.equal(result.accepted,true);
  assert.equal(result.world.events[0].id,'lab-calloff');
  assert.ok(result.world.timeline.some(item=>item.kind==='EVENT_SCHEDULED'&&item.eventId==='lab-calloff'));
  const audit=result.world.timeline.find(item=>item.kind==='INSTRUCTOR_LAB_INJECTION');
  assert.deepEqual(audit,{
    kind:'INSTRUCTOR_LAB_INJECTION',sessionId:'obs-1',instructorId:'inst-1',eventId:'lab-calloff',minute:0
  });
  assert.equal(world.events.length,0);
});
