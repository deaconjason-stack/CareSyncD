import { advanceClock } from './hospital-clock.js';

const PIPELINE = ['clock', 'trajectories', 'operations', 'events', 'consequences', 'timeline'];
const noOp = { advance: state => state };

function defaultEngines() {
  return {
    clock: { advance: state => advanceClock(state, 1) },
    trajectories: noOp,
    operations: noOp,
    events: noOp,
    consequences: noOp,
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
