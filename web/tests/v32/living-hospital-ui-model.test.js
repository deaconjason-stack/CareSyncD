import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHospitalCockpitModel } from '../../src/ui/living-hospital-view-model.js';
import { buildCareerMapModel } from '../../src/ui/career-map-view-model.js';

function world() {
  return {
    schemaVersion:32,
    clock:{minute:125,running:true},
    units:{
      'med-surg':{beds:8,occupied:6},
      icu:{beds:4,occupied:4}
    },
    patients:{
      p1:{id:'p1',unitId:'med-surg',name:'Sim Patient 1',acuity:'high',status:'deteriorating'},
      p2:{id:'p2',unitId:'med-surg',name:'Sim Patient 2',acuity:'moderate',status:'stable'}
    },
    staff:{
      s1:{id:'s1',unitId:'med-surg',role:'rn',available:true,load:2},
      s2:{id:'s2',unitId:'med-surg',role:'cna',available:false,load:3}
    },
    tasks:{
      t1:{id:'t1',unitId:'med-surg',status:'open',priority:'urgent'},
      t2:{id:'t2',unitId:'med-surg',status:'complete',priority:'routine'}
    },
    events:[{id:'e1',unitId:'med-surg',severity:'critical',type:'DETERIORATION'}],
    pressure:{used:3}
  };
}

test('cockpit model summarizes hospital state without mutating world', () => {
  const source = world();
  const before = structuredClone(source);
  const model = buildHospitalCockpitModel(source);
  assert.equal(model.minute,125);
  assert.equal(model.patientStrip.length,2);
  assert.equal(model.activeAlerts.length,1);
  assert.deepEqual(model.tasks,{open:1,complete:1,urgentOpen:1});
  assert.deepEqual(model.staffing,{total:2,available:1,unavailable:1,totalLoad:5});
  assert.equal(model.census.totalBeds,12);
  assert.equal(model.census.occupied,10);
  assert.equal(model.census.openBeds,2);
  assert.deepEqual(source,before);
});

test('career map exposes all six starting specialties and leadership progression', () => {
  const model = buildCareerMapModel({completedNodeIds:[],performance:{overall:90},competencySummary:{},xp:999999});
  assert.equal(model.specialty.filter(n=>n.starting).length,6);
  assert.ok(model.leadership.some(n=>n.id==='leadership-charge'));
});

test('career map delegates unlock rules to progression engine', () => {
  const model = buildCareerMapModel({
    completedNodeIds:['leadership-lead'],
    performance:{overall:95},
    competencySummary:{clinicalJudgment:{score:95},operations:{score:95},communication:{score:95},leadership:{score:40}},
    xp:999999
  });
  const charge = model.leadership.find(n=>n.id==='leadership-charge');
  assert.equal(charge.state,'locked');
  assert.ok(charge.blockers.includes('competency:leadership'));
});

test('completed career node is labeled completed even when currently eligible', () => {
  const model = buildCareerMapModel({completedNodeIds:['specialty-med-surg'],performance:{overall:100},competencySummary:{},xp:0});
  assert.equal(model.specialty.find(n=>n.id==='specialty-med-surg').state,'completed');
});
