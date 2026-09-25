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
