import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS } from '../../src/data/actions.js';
import { SCENARIOS, getScenario } from '../../src/data/scenarios.js';
import { SHIFTS, getShift } from '../../src/data/shifts.js';

test('catalog preserves eight missions and three hospital shifts', () => {
  assert.equal(SCENARIOS.length, 8);
  assert.equal(SHIFTS.length, 3);
  assert.ok(getScenario('hypoxia'));
  assert.ok(getShift('hospital_day'));
});

test('definitions are versioned and references are valid', () => {
  const ids = new Set(SCENARIOS.map(s => s.id));
  const actionIds = new Set(ACTIONS.map(a => a.id));
  for (const item of [...SCENARIOS, ...SHIFTS]) assert.match(item.version, /^\d+\.\d+\.\d+$/);
  for (const shift of SHIFTS) for (const id of shift.scenarioIds) assert.ok(ids.has(id), `${shift.id} references ${id}`);
  for (const scenario of SCENARIOS) for (const id of [...scenario.expected, ...scenario.critical]) assert.ok(actionIds.has(id), `${scenario.id} references ${id}`);
});
