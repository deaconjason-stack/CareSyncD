import test from 'node:test';
import assert from 'node:assert/strict';
import { ShiftEngine } from '../../src/engine/shift-engine.js';
import { getShift } from '../../src/data/shifts.js';

test('hospital day uses compressed clock and dynamically admits sepsis', () => {
  const shift = ShiftEngine.create({ definition: getShift('hospital_day'), difficulty: 'standard' });
  assert.equal(shift.snapshot().clock, '07:00');
  shift.tick(78);
  const state = shift.snapshot();
  assert.equal(state.clock, '08:18');
  assert.ok(state.patients.some(p => p.scenario.id === 'sepsis'));
});

test('delegation validates role and delegated work completes', () => {
  const shift = ShiftEngine.create({ definition: getShift('hospital_day'), difficulty: 'standard' });
  shift.tick(48);
  const task = shift.snapshot().tasks.find(t => /bathroom request/i.test(t.title));
  assert.ok(task);
  assert.equal(shift.taskCommand(task.id, 'delegate', 'provider-1').ok, false);
  assert.equal(shift.taskCommand(task.id, 'delegate', 'tech-1').ok, true);
  shift.tick(8);
  assert.equal(shift.snapshot().tasks.find(t => t.id === task.id).status, 'completed');
});

test('missed timed care reduces operations and linked clinical action closes task', () => {
  const shift = ShiftEngine.create({ definition: getShift('hospital_day'), difficulty: 'standard' });
  const opening = shift.snapshot().tasks[0];
  shift.performAction('assess', opening.patientId);
  assert.equal(shift.snapshot().tasks.find(t => t.id === opening.id).status, 'completed');
  const before = shift.snapshot().operationsScore;
  shift.tick(90);
  assert.ok(shift.snapshot().operationsScore < before);
});

test('wall-clock downtime does not advance restored simulated time', () => {
  const shift = ShiftEngine.create({ definition: getShift('hospital_day'), difficulty: 'standard' });
  shift.tick(75);
  const restored = ShiftEngine.restore(shift.serialize(), { restoredAt: '2030-01-01T00:00:00.000Z' });
  assert.equal(restored.snapshot().clock, '08:15');
});

test('handoff event creates summaries and SBAR tasks', () => {
  const shift = ShiftEngine.create({ definition: getShift('hospital_day'), difficulty: 'standard' });
  shift.tick(420);
  const state = shift.snapshot();
  assert.ok(state.handoff.length >= 4);
  assert.ok(state.tasks.some(t => /SBAR handoff/.test(t.title)));
});
