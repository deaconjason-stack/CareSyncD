export function resolveConsequences(state) {
  const pending = state.pendingConsequences ?? [];
  if (pending.length === 0) return state;

  const existing = state.resolvedConsequences ?? [];
  const resolved = pending.map((consequence, index) => ({
    ...consequence,
    resolvedMinute: state.clock.minute,
    downstreamEventId: `event-${existing.length + index + 1}`
  }));

  return {
    ...state,
    pendingConsequences: [],
    resolvedConsequences: [...existing, ...resolved],
    timeline: [
      ...state.timeline,
      ...resolved.map(item => ({
        kind: 'CONSEQUENCE_RESOLVED',
        patientId: item.patientId,
        minute: state.clock.minute,
        sourceDecisionId: item.sourceDecisionId,
        downstreamEventId: item.downstreamEventId,
        consequenceKind: item.kind
      }))
    ]
  };
}
