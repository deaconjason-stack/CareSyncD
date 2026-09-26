export function advanceClock(state, minutes = 1) {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new RangeError('minutes must be a non-negative finite number');
  }
  return {
    ...state,
    clock: {
      ...state.clock,
      minute: state.clock.minute + minutes
    }
  };
}
