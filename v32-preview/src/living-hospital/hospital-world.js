import { advanceClock } from './hospital-clock.js';
import { advanceTrajectories, recordDecision } from './trajectory-engine.js';
import { advanceDelegatedTasks } from './delegation-engine.js';
import { advanceBedFlow } from './census-engine.js';
import { advanceScheduledEvents } from './event-engine.js';
import { resolveConsequences } from './consequence-engine.js';

const PIPELINE = ['clock', 'trajectories', 'operations', 'events', 'consequences', 'timeline'];

function defaultEngines() {
  return {
    clock: { advance: state => advanceClock(state, 1) },
    trajectories: {
      advance(state, context) {
        const withDecisions = context.actions.reduce(
          (next, action) => recordDecision(next, action),
          state
        );
        return advanceTrajectories(withDecisions, context.rng);
      }
    },
    operations: {
      advance(state) {
        return advanceBedFlow(advanceDelegatedTasks(state));
      }
    },
    events: { advance: state => advanceScheduledEvents(state) },
    consequences: { advance: state => resolveConsequences(state) },
    timeline: {
      advance(state, context) {
        return {
          ...state,
          timeline: [
            ...state.timeline,
            {
              kind: 'TICK',
              minute: state.clock.minute,
              actions: context.actions.map(action => ({ ...action }))
            }
          ]
        };
      }
    }
  };
}

export function createHospitalWorld({ state, rng, engines }) {
  let current = state;
  const pipeline = { ...defaultEngines(), ...engines };

  return {
    tick(actions = []) {
      const context = { rng, actions: actions.map(action => ({ ...action })) };
      for (const name of PIPELINE) {
        const engine = pipeline[name];
        if (!engine || typeof engine.advance !== 'function') {
          throw new TypeError(`Missing advance() engine: ${name}`);
        }
        current = engine.advance(current, context);
      }
      return current;
    },
    snapshot() {
      return current;
    }
  };
}

createHospitalWorld.withDefaultEngines = function withDefaultEngines({ state, rng }) {
  return createHospitalWorld({ state, rng, engines: defaultEngines() });
};
