import test from 'node:test';
import assert from 'node:assert/strict';
import { baseWorld, guidedPressureWorld } from './helpers.js';
import { eventEligible, scheduleEvent } from '../../src/living-hospital/event-engine.js';
import { consumePressure } from '../../src/living-hospital/pressure-budget.js';

test('Guided rejects an event that exceeds pressure budget', () => {
  const out = scheduleEvent(guidedPressureWorld(), {
    id: 'surge-1', level: 'hospital', pressureCost: 2, prerequisites: [], cooldownKey: 'surge'
  });
  assert.equal(out.accepted, false);
  assert.equal(out.reason, 'pressure-budget');
});

test('Standard and Challenge use larger default pressure budgets', () => {
  const standard = baseWorld({ difficulty: 'standard', pressure: { used: 4 } });
  const acceptedStandard = scheduleEvent(standard, {
    id: 'std-event', level: 'unit', pressureCost: 2, prerequisites: [], cooldownKey: 'std'
  });
  assert.equal(acceptedStandard.accepted, true);
  assert.equal(acceptedStandard.state.pressure.used, 6);

  const challenge = baseWorld({ difficulty: 'challenge', pressure: { used: 8 } });
  const acceptedChallenge = scheduleEvent(challenge, {
    id: 'challenge-event', level: 'hospital', pressureCost: 2, prerequisites: [], cooldownKey: 'challenge'
  });
  assert.equal(acceptedChallenge.accepted, true);
  assert.equal(acceptedChallenge.state.pressure.used, 10);
});

test('nonsensical contextual prerequisite rejects event', () => {
  const state = baseWorld({ units: { ed: { surgeActive: false } } });
  const event = {
    id: 'surge-followup', level: 'unit', pressureCost: 1, cooldownKey: 'surge-followup',
    prerequisites: [{ path: 'units.ed.surgeActive', op: 'eq', value: true }]
  };
  assert.equal(eventEligible(state, event), false);
  const out = scheduleEvent(state, event);
  assert.equal(out.accepted, false);
  assert.equal(out.reason, 'prerequisite');
});

test('cooldown prevents the same event family from firing again too soon', () => {
  const event = {
    id: 'calloff-1', level: 'unit', pressureCost: 1, prerequisites: [], cooldownKey: 'staff-calloff', cooldownMinutes: 5
  };
  const first = scheduleEvent(baseWorld(), event);
  assert.equal(first.accepted, true);
  const second = scheduleEvent(first.state, { ...event, id: 'calloff-2' });
  assert.equal(second.accepted, false);
  assert.equal(second.reason, 'cooldown');
});

test('consumePressure returns a cloned state', () => {
  const before = baseWorld({ pressure: { used: 1, limit: 6 } });
  const after = consumePressure(before, 2);
  assert.equal(before.pressure.used, 1);
  assert.equal(after.pressure.used, 3);
});
