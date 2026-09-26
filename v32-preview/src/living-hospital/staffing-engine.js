export function setStaffAvailability(state, staffId, available, reason = null) {
  const member = state.staff?.[staffId];
  if (!member) throw new RangeError(`Unknown staff member: ${staffId}`);
  return {
    ...state,
    staff: {
      ...state.staff,
      [staffId]: { ...member, available: Boolean(available) }
    },
    timeline: [
      ...state.timeline,
      {
        kind: 'STAFF_AVAILABILITY_CHANGED',
        staffId,
        available: Boolean(available),
        reason,
        minute: state.clock.minute
      }
    ]
  };
}
