import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION, createLearnerProfile, createSimulationRun, assertSimulationRun } from '../../src/domain/schema.js';

test('new records are versioned and retain definition version', () => {
  const profile = createLearnerProfile({ learnerId: 'learner-1', displayName: 'Learner' });
  const run = createSimulationRun({ runId: 'run-1', kind: 'scenario', definitionId: 'hypoxia', definitionVersion: '3.0.0', difficulty: 'standard', startTime: '2026-09-22T12:00:00.000Z' });
  assert.equal(profile.schemaVersion, SCHEMA_VERSION);
  assert.equal(run.schemaVersion, SCHEMA_VERSION);
  assert.equal(run.definitionVersion, '3.0.0');
  assert.equal(run.status, 'active');
});

test('invalid runs are rejected', () => {
  assert.throws(() => assertSimulationRun({ schemaVersion: 1, runId: '' }), /runId/);
});
