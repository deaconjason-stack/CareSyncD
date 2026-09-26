import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  V32_ROUTES,
  buildLivingHospitalPage,
  buildCareerPage,
  buildFounderPage,
  buildOrganizationsPage,
  buildInstructorLivePage
} from '../../src/app/v32-shell.js';
import { listUnitDefinitions } from '../../src/living-hospital/unit-catalog.js';

const here=dirname(fileURLToPath(import.meta.url));
const webRoot=resolve(here,'../..');
const read=path=>readFile(resolve(webRoot,path),'utf8');

const competencies={
  clinicalJudgment:{score:0},operations:{score:0},communication:{score:0},leadership:{score:0}
};

test('v3.2 shell declares every approved platform surface while preserving legacy routes',()=>{
  assert.deepEqual(V32_ROUTES,[
    'home','living-hospital','missions','shifts','career','progress','debriefs',
    'organizations','instructor-live','founder','settings'
  ]);
});

test('Living Hospital page is sourced from the six-unit catalog and identifies v3.2 preview',()=>{
  const units=listUnitDefinitions();
  assert.equal(units.length,6);
  const html=buildLivingHospitalPage({units});
  assert.match(html,/CareSyncD v3\.2 Preview/i);
  assert.match(html,/The Living Hospital/i);
  for(const unit of units){
    assert.match(html,new RegExp(unit.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
  }
  assert.match(html,/Educational simulation only/i);
});

test('Career, Founder, Organizations and Instructor Live surfaces are truthful and safety-bounded',()=>{
  const career=buildCareerPage({completedNodeIds:[],performance:{overall:0},competencySummary:competencies,xp:0});
  assert.match(career,/Career/i);
  assert.match(career,/Clinical Judgment/i);
  assert.match(career,/Leadership/i);

  const founder=buildFounderPage({
    asOf:'2026-09-25T20:00:00Z',
    subscribers:{total:0,status:{active:0,paymentIssue:0,canceled:0,expired:0},new30d:0,byPlan:{},byCadence:{}},
    funnel:{visitor:0,demo:0,account:0,checkout:0,subscriber:0,activeLearner:0,renewal:0},
    acquisition:{},learning:{shiftsStarted:0,shiftsCompleted:0,completedByUnit:{}},identifiedSubscribers:[]
  });
  assert.match(founder,/Founder Command Center/i);
  assert.match(founder,/0/);
  assert.doesNotMatch(founder,/fake|sample subscriber|example@example/i);

  const organizations=buildOrganizationsPage();
  assert.match(organizations,/Organizations/i);
  assert.match(organizations,/Cohorts/i);
  assert.match(organizations,/Assignments/i);

  const instructor=buildInstructorLivePage();
  assert.match(instructor,/Instructor Observation/i);
  assert.match(instructor,/visible to the learner/i);
  assert.match(instructor,/Simulation Lab/i);
  assert.doesNotMatch(instructor,/hidden observation|secretly observe/i);
});

test('browser shell exposes v3.2 routes without removing the existing mission and shift app',async()=>{
  const [index,app]=await Promise.all([read('index.html'),read('app.js')]);
  for(const route of ['living-hospital','career','organizations','instructor-live','founder']){
    assert.match(index,new RegExp(`data-nav=["']${route}["']`));
    assert.match(app,new RegExp(route));
  }
  assert.match(index,/data-nav=["']missions["']/);
  assert.match(index,/data-nav=["']shifts["']/);
  assert.match(app,/SCENARIOS/);
  assert.match(app,/SHIFTS/);
  assert.match(index,/Educational simulation only/i);
});
