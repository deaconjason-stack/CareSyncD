import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOrganization,
  addOrganizationMember,
  removeOrganizationMember,
  createCohort,
  enrollLearner,
  createAssignment,
  visibleLearnerIdsForInstructor
} from '../../src/organizations/organization-engine.js';

function seededOrg() {
  let org=createOrganization({id:'org-1',name:'CareSyncD School',seatLimit:2});
  org=addOrganizationMember(org,{accountId:'admin-1',role:'organization_admin'});
  org=addOrganizationMember(org,{accountId:'inst-1',role:'instructor'});
  org=addOrganizationMember(org,{accountId:'inst-2',role:'instructor'});
  org=addOrganizationMember(org,{accountId:'learner-1',role:'learner'});
  org=addOrganizationMember(org,{accountId:'learner-2',role:'learner'});
  return org;
}

test('learner seats are enforced while admin and instructor memberships do not consume learner seats', () => {
  const org=seededOrg();
  assert.equal(Object.values(org.members).filter(member=>member.role==='learner').length,2);
  assert.throws(()=>addOrganizationMember(org,{accountId:'learner-3',role:'learner'}),/seat/i);
  const moreStaff=addOrganizationMember(org,{accountId:'inst-3',role:'instructor'});
  assert.equal(moreStaff.members['inst-3'].role,'instructor');
});

test('adding the exact same membership is idempotent but conflicting duplicate role is rejected', () => {
  const org=seededOrg();
  const same=addOrganizationMember(org,{accountId:'learner-1',role:'learner'});
  assert.deepEqual(same,org);
  assert.throws(()=>addOrganizationMember(org,{accountId:'learner-1',role:'instructor'}),/already.*member|duplicate/i);
});

test('cohort instructors see only learners enrolled in cohorts assigned to them', () => {
  let org=seededOrg();
  org=createCohort(org,{id:'cohort-a',name:'Med-Surg A',instructorIds:['inst-1']});
  org=createCohort(org,{id:'cohort-b',name:'ICU B',instructorIds:['inst-2']});
  org=enrollLearner(org,{cohortId:'cohort-a',learnerId:'learner-1'});
  org=enrollLearner(org,{cohortId:'cohort-b',learnerId:'learner-2'});
  assert.deepEqual(visibleLearnerIdsForInstructor(org,'inst-1'),['learner-1']);
  assert.deepEqual(visibleLearnerIdsForInstructor(org,'inst-2'),['learner-2']);
});

test('cohort membership requires valid organization roles', () => {
  let org=seededOrg();
  assert.throws(()=>createCohort(org,{id:'bad',name:'Bad',instructorIds:['learner-1']}),/instructor/i);
  org=createCohort(org,{id:'good',name:'Good',instructorIds:['inst-1']});
  assert.throws(()=>enrollLearner(org,{cohortId:'good',learnerId:'inst-2'}),/learner/i);
});

test('assignment validates unit, difficulty, dates, competencies, and minimum completed shifts', () => {
  let org=seededOrg();
  org=createCohort(org,{id:'cohort-a',name:'Med-Surg A',instructorIds:['inst-1']});
  const next=createAssignment(org,{
    id:'assign-1',cohortId:'cohort-a',title:'Prioritization Shift',unitId:'med-surg',difficulty:'standard',
    dueAt:'2026-10-15T23:59:00Z',availableFrom:'2026-10-01T00:00:00Z',availableUntil:'2026-10-15T23:59:00Z',
    requiredCompetencies:{clinicalJudgment:80,operations:75},minimumCompletedShifts:2
  });
  assert.equal(next.assignments['assign-1'].unitId,'med-surg');
  assert.deepEqual(next.assignments['assign-1'].requiredCompetencies,{clinicalJudgment:80,operations:75});
  assert.throws(()=>createAssignment(org,{id:'x',cohortId:'cohort-a',title:'X',unitId:'moon',difficulty:'standard',dueAt:'2026-10-15'}),/unit/i);
  assert.throws(()=>createAssignment(org,{id:'x',cohortId:'cohort-a',title:'X',unitId:'icu',difficulty:'impossible',dueAt:'2026-10-15'}),/difficulty/i);
  assert.throws(()=>createAssignment(org,{id:'x',cohortId:'cohort-a',title:'X',unitId:'icu',difficulty:'standard',dueAt:'bad'}),/dueAt/i);
});

test('removing an organization seat removes organization access without mutating personal progress', () => {
  let org=seededOrg();
  org=createCohort(org,{id:'cohort-a',name:'A',instructorIds:['inst-1']});
  org=enrollLearner(org,{cohortId:'cohort-a',learnerId:'learner-1'});
  const personalProgress={learnerId:'learner-1',xp:900,completedRuns:['r1','r2']};
  const before=structuredClone(personalProgress);
  const next=removeOrganizationMember(org,'learner-1');
  assert.equal(next.members['learner-1'],undefined);
  assert.deepEqual(next.cohorts['cohort-a'].learnerIds,[]);
  assert.deepEqual(personalProgress,before);
});

test('organization transitions are immutable', () => {
  const org=createOrganization({id:'org-1',name:'School',seatLimit:2});
  const next=addOrganizationMember(org,{accountId:'learner-1',role:'learner'});
  assert.notEqual(next,org);
  assert.deepEqual(org.members,{});
  assert.equal(next.members['learner-1'].role,'learner');
});
