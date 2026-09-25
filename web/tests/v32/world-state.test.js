import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldState, validateWorldState } from '../../src/living-hospital/world-state.js';
import { createSeededRng } from '../../src/living-hospital/seeded-rng.js';
import { createScopePolicy } from '../../src/living-hospital/scope-policy.js';

test('creates schema 32 Living Hospital state', () => {
  const s = createWorldState({ seed: 42, difficulty: 'guided', shiftFormat: 'training' });
  assert.equal(validateWorldState(s), true);
  assert.equal(s.schemaVersion, 32);
  assert.deepEqual(Object.keys(s.competencies), ['clinicalJudgment','operations','communication','leadership']);
});

test('seeded RNG repeats the same sequence for the same seed', () => {
  const a = createSeededRng(123);
  const b = createSeededRng(123);
  assert.deepEqual([a(), a(), a(), a()], [b(), b(), b(), b()]);
});

test('scope policy uses supplied rules instead of universal role assumptions', () => {
  const policy = createScopePolicy({
    perform: ['assess'],
    delegate: { vitals: ['cna'], glucose: ['lpn'] }
  });
  assert.equal(policy.canPerform('assess'), true);
  assert.equal(policy.canPerform('iv-push'), false);
  assert.equal(policy.canDelegate('vitals', 'cna'), true);
  assert.equal(policy.canDelegate('vitals', 'lpn'), false);
});
