import test from 'node:test';
import assert from 'node:assert/strict';
import { CAREER_TREES, getCareerNode } from '../../src/living-hospital/career-trees.js';
import { evaluateCareerUnlock } from '../../src/living-hospital/progression-engine.js';

const strong = {
  clinicalJudgment:{score:95}, operations:{score:95}, communication:{score:95}, leadership:{score:95}
};

test('all six approved units are available as starting specialty choices', () => {
  assert.deepEqual(CAREER_TREES.specialty.startingNodes.sort(), [
    'specialty-ed','specialty-icu','specialty-med-surg','specialty-ob','specialty-pediatrics','specialty-telemetry'
  ]);
  for (const nodeId of CAREER_TREES.specialty.startingNodes) {
    const result = evaluateCareerUnlock({ nodeId, completedNodeIds:[], performance:{overall:0}, competencySummary:{}, xp:0 });
    assert.equal(result.unlocked, true);
  }
});

test('cross-training requires its declared prerequisite', () => {
  const node = getCareerNode('cross-med-surg-telemetry');
  assert.deepEqual(node.prerequisites, ['specialty-med-surg']);
  const blocked = evaluateCareerUnlock({ nodeId:node.id, completedNodeIds:[], performance:{overall:99}, competencySummary:strong, xp:5000 });
  assert.equal(blocked.unlocked, false);
  assert.ok(blocked.blockers.includes('prerequisite:specialty-med-surg'));
});

test('qualified learner can unlock Charge Nurse', () => {
  const result = evaluateCareerUnlock({
    nodeId:'leadership-charge',
    completedNodeIds:['leadership-lead'],
    performance:{overall:90},
    competencySummary:strong,
    xp:0
  });
  assert.equal(result.unlocked, true);
  assert.deepEqual(result.blockers, []);
});

test('XP alone cannot unlock Charge Nurse', () => {
  const result = evaluateCareerUnlock({
    nodeId:'leadership-charge',
    completedNodeIds:['leadership-lead'],
    performance:{overall:95},
    competencySummary:{ clinicalJudgment:{score:95}, operations:{score:95}, communication:{score:95}, leadership:{score:40} },
    xp:999999
  });
  assert.equal(result.unlocked, false);
  assert.ok(result.blockers.includes('competency:leadership'));
});
