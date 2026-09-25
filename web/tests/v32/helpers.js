import { createWorldState } from '../../src/living-hospital/world-state.js';

export const baseWorld = (overrides = {}) => Object.assign(
  createWorldState({ seed: 7, difficulty: 'standard', shiftFormat: 'career' }),
  overrides
);

export const patientFixture = (id = 'p1') => ({
  id,
  unitId: 'med-surg',
  trajectory: { state: 'stable', branch: 'baseline' },
  pending: []
});

export const staffFixture = (id = 'cna-1') => ({
  id,
  role: 'cna',
  available: true,
  workload: 0,
  queue: []
});

export const blockedTransferWorld = () => ({
  ...baseWorld(),
  patients: { p1: patientFixture() },
  transfers: {},
  units: { icu: { openBeds: 0, staffReady: false } }
});

export const guidedPressureWorld = () => ({
  ...baseWorld({ difficulty: 'guided' }),
  pressure: { used: 3, limit: 3 }
});
