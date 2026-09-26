const DIFFICULTIES = new Set(['guided', 'standard', 'challenge']);
const SHIFT_FORMATS = new Set(['training', 'career', 'event']);

export function createWorldState({ seed, difficulty, shiftFormat }) {
  return {
    schemaVersion: 32,
    seed,
    difficulty,
    shiftFormat,
    clock: { minute: 0, running: false },
    units: {},
    patients: {},
    staff: {},
    tasks: {},
    transfers: {},
    events: [],
    timeline: [],
    pressure: { used: 0 },
    competencies: {
      clinicalJudgment: 0,
      operations: 0,
      communication: 0,
      leadership: 0
    }
  };
}

export function validateWorldState(state) {
  return Boolean(
    state &&
    state.schemaVersion === 32 &&
    Number.isInteger(state.seed) &&
    DIFFICULTIES.has(state.difficulty) &&
    SHIFT_FORMATS.has(state.shiftFormat) &&
    state.clock && Number.isFinite(state.clock.minute) &&
    state.competencies &&
    ['clinicalJudgment','operations','communication','leadership'].every(key =>
      Object.prototype.hasOwnProperty.call(state.competencies, key)
    )
  );
}
