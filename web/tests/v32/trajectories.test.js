import test from 'node:test';
import assert from 'node:assert/strict';
import { baseWorld, patientFixture } from './helpers.js';
import { recordDecision, advanceTrajectories } from '../../src/living-hospital/trajectory-engine.js';
import { resolveConsequences } from '../../src/living-hospital/consequence-engine.js';

const authored = {
  initial: 'watching',
  states: {
    watching: {
      reassessByMinute: 20,
      onTime: 'improving',
      late: 'delayed-recognition',
      criticalByMinute: 35,
      critical: 'critical'
    },
    improving: {},
    'delayed-recognition': {
      criticalByMinute: 40,
      critical: 'critical'
    },
    critical: {}
  }
};

function patientWorld(minute) {
  return baseWorld({
    clock: { minute, running: true },
    patients: {
      p1: {
        ...patientFixture(),
        trajectory: { definition: authored, state: 'watching', branch: 'baseline' }
      }
    }
  });
}

test('late reassessment enters delayed-recognition branch and records evidence', () => {
  let s = patientWorld(25);
  s = recordDecision(s, { type: 'REASSESS', patientId: 'p1', minute: 25 });
  s = advanceTrajectories(s, () => 0.5);
  assert.equal(s.patients.p1.trajectory.state, 'delayed-recognition');
  assert.ok(s.timeline.some(e => e.kind === 'MISSED_WINDOW'));
  assert.equal(s.pendingConsequences.length, 1);
  assert.equal(s.pendingConsequences[0].sourceDecisionId, 'decision-1');
});

test('on-time reassessment enters improving branch', () => {
  let s = patientWorld(15);
  s = recordDecision(s, { type: 'REASSESS', patientId: 'p1', minute: 15 });
  s = advanceTrajectories(s, () => 0.5);
  assert.equal(s.patients.p1.trajectory.state, 'improving');
  assert.ok(s.timeline.some(e => e.kind === 'WINDOW_MET'));
});

test('unreassessed patient can follow an authored critical pathway', () => {
  let s = patientWorld(36);
  s = advanceTrajectories(s, () => 0.5);
  assert.equal(s.patients.p1.trajectory.state, 'critical');
  assert.ok(s.timeline.some(e => e.kind === 'CRITICAL_DETERIORATION'));
  assert.equal(s.pendingConsequences[0].kind, 'CRITICAL_DETERIORATION');
});

test('consequence resolver consumes each record once and links downstream evidence', () => {
  let s = patientWorld(25);
  s = recordDecision(s, { type: 'REASSESS', patientId: 'p1', minute: 25 });
  s = advanceTrajectories(s, () => 0.5);
  const once = resolveConsequences(s);
  const twice = resolveConsequences(once);
  assert.equal(once.pendingConsequences.length, 0);
  assert.equal(once.resolvedConsequences.length, 1);
  assert.equal(once.resolvedConsequences[0].sourceDecisionId, 'decision-1');
  assert.match(once.resolvedConsequences[0].downstreamEventId, /^event-/);
  assert.deepEqual(twice.resolvedConsequences, once.resolvedConsequences);
});
