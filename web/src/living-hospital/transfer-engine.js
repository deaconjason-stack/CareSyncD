export function transferBlockers(state, request) {
  const unit = state.units?.[request.toUnit];
  if (!unit) throw new RangeError(`Unknown destination unit: ${request.toUnit}`);
  const blockers = [];
  if ((unit.openBeds ?? 0) <= 0) blockers.push('bed');
  if (!unit.staffReady) blockers.push('staffing');
  if (!request.handoffReady) blockers.push('handoff');
  if (!request.transportReady) blockers.push('transport');
  return blockers;
}

export function requestTransfer(state, { patientId, toUnit, handoffReady = false, transportReady = false }) {
  if (!state.patients?.[patientId]) throw new RangeError(`Unknown patient: ${patientId}`);
  const request = { patientId, toUnit, handoffReady: Boolean(handoffReady), transportReady: Boolean(transportReady) };
  const blockers = transferBlockers(state, request);
  return {
    ...state,
    transfers: {
      ...(state.transfers ?? {}),
      [patientId]: {
        ...request,
        status: blockers.length ? 'waiting' : 'ready',
        blockers,
        requestedMinute: state.clock.minute
      }
    },
    timeline: [
      ...state.timeline,
      {
        kind: 'TRANSFER_REQUESTED',
        patientId,
        toUnit,
        blockers: [...blockers],
        minute: state.clock.minute
      }
    ]
  };
}
