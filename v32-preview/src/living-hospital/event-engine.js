import { canConsumePressure, consumePressure } from './pressure-budget.js';

function valueAtPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function prerequisiteMet(state, prerequisite) {
  const actual = valueAtPath(state, prerequisite.path);
  switch (prerequisite.op) {
    case 'eq': return actual === prerequisite.value;
    case 'neq': return actual !== prerequisite.value;
    case 'gt': return actual > prerequisite.value;
    case 'gte': return actual >= prerequisite.value;
    case 'lt': return actual < prerequisite.value;
    case 'lte': return actual <= prerequisite.value;
    case 'truthy': return Boolean(actual);
    case 'falsy': return !actual;
    default: return false;
  }
}

function validateEvent(event) {
  if (!event?.id || !event?.level || !Number.isFinite(event.pressureCost) || !Array.isArray(event.prerequisites) || !event.cooldownKey) {
    throw new TypeError('event must declare id, level, pressureCost, prerequisites, and cooldownKey');
  }
}

function cooldownActive(state, event) {
  const until = state.eventCooldowns?.[event.cooldownKey];
  return Number.isFinite(until) && state.clock.minute < until;
}

export function eventEligible(state, event) {
  validateEvent(event);
  if (!event.prerequisites.every(prerequisite => prerequisiteMet(state, prerequisite))) return false;
  if (cooldownActive(state, event)) return false;
  return canConsumePressure(state, event.pressureCost);
}

export function scheduleEvent(state, event) {
  validateEvent(event);

  if (!event.prerequisites.every(prerequisite => prerequisiteMet(state, prerequisite))) {
    return { accepted: false, reason: 'prerequisite', state };
  }
  if (cooldownActive(state, event)) {
    return { accepted: false, reason: 'cooldown', state };
  }
  if (!canConsumePressure(state, event.pressureCost)) {
    return { accepted: false, reason: 'pressure-budget', state };
  }

  const withPressure = consumePressure(state, event.pressureCost);
  const cooldownMinutes = Math.max(1, event.cooldownMinutes ?? 1);
  const scheduled = {
    ...event,
    prerequisites: event.prerequisites.map(item => ({ ...item })),
    status: 'scheduled',
    scheduledMinute: state.clock.minute
  };
  const nextState = {
    ...withPressure,
    events: [...(state.events ?? []), scheduled],
    eventCooldowns: {
      ...(state.eventCooldowns ?? {}),
      [event.cooldownKey]: state.clock.minute + cooldownMinutes
    },
    timeline: [
      ...state.timeline,
      {
        kind: 'EVENT_SCHEDULED',
        eventId: event.id,
        level: event.level,
        pressureCost: event.pressureCost,
        minute: state.clock.minute
      }
    ]
  };
  return { accepted: true, reason: null, state: nextState };
}

export function advanceScheduledEvents(state) {
  let changed = false;
  const events = (state.events ?? []).map(event => {
    if (event.status !== 'scheduled' || event.scheduledMinute > state.clock.minute) return event;
    changed = true;
    return { ...event, status: 'active', activatedMinute: state.clock.minute };
  });
  if (!changed) return state;
  return {
    ...state,
    events,
    timeline: [
      ...state.timeline,
      ...events
        .filter(event => event.activatedMinute === state.clock.minute)
        .map(event => ({ kind: 'EVENT_ACTIVATED', eventId: event.id, level: event.level, minute: state.clock.minute }))
    ]
  };
}
