import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../../src/engine/simulation-engine.js';
import { getScenario } from '../../src/data/scenarios.js';

test('hypoxia airway and oxygen improve saturation', () => {
  const engine = SimulationEngine.create({ definition: getScenario('hypoxia'), difficulty: 'standard', learnerName: 'Test' });
  const before = engine.snapshot().patient.vitals.spo2;
  engine.performAction('assess'); engine.performAction('airway'); engine.performAction('oxygen');
  assert.ok(engine.snapshot().patient.vitals.spo2 > before);
});

test('challenge disables hints and sequence errors are surfaced', () => {
  const challenge = SimulationEngine.create({ definition: getScenario('hypoxia'), difficulty: 'challenge' });
  assert.equal(challenge.requestHint().ok, false);
  const standard = SimulationEngine.create({ definition: getScenario('hypoxia'), difficulty: 'standard' });
  assert.match(standard.performAction('oxygen').message, /Sequence concern/);
});

test('scheduled events fire once across snapshot restore', () => {
  const engine = SimulationEngine.create({ definition: getScenario('hypoxia'), difficulty: 'standard' });
  engine.tick(50);
  const before = engine.snapshot().events.filter(e => /getting tired/.test(e.text)).length;
  const restored = SimulationEngine.restore(engine.serialize());
  restored.tick(5);
  const after = restored.snapshot().events.filter(e => /getting tired/.test(e.text)).length;
  assert.equal(before, 1); assert.equal(after, 1);
});

test('cardiac arrest CPR then defibrillation restores pulse', () => {
  const engine = SimulationEngine.create({ definition: getScenario('cardiac_arrest'), difficulty: 'standard' });
  engine.performAction('call_code'); engine.performAction('cpr'); engine.performAction('defibrillate');
  assert.equal(engine.snapshot().patient.vitals.heartRate, 92);
});
