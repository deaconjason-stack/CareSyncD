const DEFAULT_LIMITS = Object.freeze({ guided: 3, standard: 6, challenge: 10 });

export function pressureLimit(state) {
  const explicit = state.pressure?.limit;
  if (Number.isFinite(explicit)) return explicit;
  return DEFAULT_LIMITS[state.difficulty] ?? DEFAULT_LIMITS.standard;
}

export function canConsumePressure(state, cost) {
  if (!Number.isFinite(cost) || cost < 0) return false;
  return (state.pressure?.used ?? 0) + cost <= pressureLimit(state);
}

export function consumePressure(state, cost) {
  if (!Number.isFinite(cost) || cost < 0) {
    throw new RangeError('pressure cost must be a non-negative finite number');
  }
  return {
    ...state,
    pressure: {
      ...(state.pressure ?? {}),
      used: (state.pressure?.used ?? 0) + cost,
      limit: pressureLimit(state)
    }
  };
}
