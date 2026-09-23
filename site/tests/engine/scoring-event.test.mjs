import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../../src/engine/event-bus.js';
import { calculateOverallShiftScore, deriveAchievements } from '../../src/engine/scoring-engine.js';

test('event bus publishes and unsubscribe stops delivery', () => {
  const bus = new EventBus(); let count=0; const off=bus.subscribe('state',()=>count++);
  bus.publish('state',{}); off(); bus.publish('state',{}); assert.equal(count,1);
});

test('v3 shift weighting and achievement predicates are preserved', () => {
  assert.equal(calculateOverallShiftScore(80,100),85);
  assert.deepEqual(deriveAchievements({score:90,switches:5,operationsScore:95,missedTasks:0}),['Shift Commander','Situational Awareness','Operational Excellence','Nothing Fell Through']);
});
