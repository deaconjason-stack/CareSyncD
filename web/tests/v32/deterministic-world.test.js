import test from 'node:test';
import assert from 'node:assert/strict';
import { createHospitalWorld } from '../../src/living-hospital/hospital-world.js';
import { advanceClock } from '../../src/living-hospital/hospital-clock.js';
import { createSeededRng } from '../../src/living-hospital/seeded-rng.js';
import { baseWorld } from './helpers.js';

const tagged = tag => ({ advance: s => ({ ...s, timeline: [...s.timeline, tag] }) });

test('tick order is clock -> trajectories -> operations -> events -> consequences -> timeline', () => {
  const engines = {
    clock: tagged('clock'),
    trajectories: tagged('trajectories'),
    operations: tagged('operations'),
    events: tagged('events'),
    consequences: tagged('consequences'),
    timeline: tagged('timeline')
  };
  const world = createHospitalWorld({ state: baseWorld(), rng: createSeededRng(7), engines });
  const out = world.tick([]);
  assert.deepEqual(out.timeline, ['clock','trajectories','operations','events','consequences','timeline']);
});

test('advanceClock clones state and advances only the simulated minute', () => {
  const before = baseWorld({ clock: { minute: 10, running: true } });
  const out = advanceClock(before, 5);
  assert.equal(out.clock.minute, 15);
  assert.equal(before.clock.minute, 10);
  assert.equal(out.clock.running, true);
});

test('same seed and same actions produce identical state', () => {
  const run = () => {
    const world = createHospitalWorld.withDefaultEngines({ state: baseWorld(), rng: createSeededRng(99) });
    let out;
    for (let i = 0; i < 60; i++) {
      out = world.tick(i === 5 ? [{ type: 'ASSESS', patientId: 'p1' }] : []);
    }
    return out;
  };
  assert.deepEqual(run(), run());
});

test('default engines run trajectories, operations, events, and consequences in one hospital tick', () => {
  const trajectory = {
    initial: 'watching',
    states: {
      watching: { reassessByMinute: 20, late: 'delayed-recognition' },
      'delayed-recognition': {}
    }
  };
  const state = baseWorld({
    clock: { minute: 24, running: true },
    patients: {
      p1: {
        id: 'p1', unitId: 'med-surg', pending: [],
        trajectory: { definition: trajectory, state: 'watching', branch: 'baseline' }
      }
    },
    decisions: [{ id: 'decision-1', type: 'REASSESS', patientId: 'p1', minute: 25 }],
    staff: {
      'cna-1': { id: 'cna-1', role: 'cna', available: true, workload: 0, queue: ['t1'] }
    },
    tasks: {
      t1: { id: 't1', actionId: 'vitals', status: 'delegated', delegatedTo: 'cna-1', requiredTicks: 1, progressTicks: 0 }
    },
    events: [{
      id: 'lab-return', level: 'patient', pressureCost: 1, prerequisites: [], cooldownKey: 'lab',
      status: 'scheduled', scheduledMinute: 25
    }]
  });

  const world = createHospitalWorld.withDefaultEngines({ state, rng: createSeededRng(99) });
  const out = world.tick([]);

  assert.equal(out.clock.minute, 25);
  assert.equal(out.patients.p1.trajectory.state, 'delayed-recognition');
  assert.equal(out.tasks.t1.status, 'complete');
  assert.equal(out.events[0].status, 'active');
  assert.equal(out.pendingConsequences.length, 0);
  assert.equal(out.resolvedConsequences.length, 1);
  assert.equal(out.timeline.at(-1).kind, 'TICK');
});

test('learner actions passed to tick are recorded before trajectory evaluation', () => {
  const trajectory = {
    initial: 'watching',
    states: {
      watching: { reassessByMinute: 20, onTime: 'improving', late: 'delayed-recognition' },
      improving: {},
      'delayed-recognition': {}
    }
  };
  const state = baseWorld({
    clock: { minute: 14, running: true },
    patients: {
      p1: {
        id: 'p1', unitId: 'med-surg', pending: [],
        trajectory: { definition: trajectory, state: 'watching', branch: 'baseline' }
      }
    }
  });

  const world = createHospitalWorld.withDefaultEngines({ state, rng: createSeededRng(42) });
  const out = world.tick([{ type: 'REASSESS', patientId: 'p1' }]);

  assert.equal(out.clock.minute, 15);
  assert.equal(out.decisions.length, 1);
  assert.equal(out.decisions[0].minute, 15);
  assert.equal(out.patients.p1.trajectory.state, 'improving');
  assert.ok(out.timeline.some(e => e.kind === 'DECISION' && e.actionType === 'REASSESS'));
});
