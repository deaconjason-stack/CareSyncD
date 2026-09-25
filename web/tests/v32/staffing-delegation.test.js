import test from 'node:test';
import assert from 'node:assert/strict';
import { baseWorld, staffFixture } from './helpers.js';
import { setStaffAvailability } from '../../src/living-hospital/staffing-engine.js';
import { delegateTask, advanceDelegatedTasks } from '../../src/living-hospital/delegation-engine.js';

const scope = { canDelegate: () => true };
const noScope = { canDelegate: () => false };

function taskWorld(staff = staffFixture()) {
  return baseWorld({
    staff: { 'cna-1': staff },
    tasks: { t1: { id: 't1', actionId: 'vitals', status: 'open', requiredTicks: 2 } }
  });
}

test('delegation queues work instead of completing immediately', () => {
  const out = delegateTask(taskWorld(), { taskId: 't1', staffId: 'cna-1', scopePolicy: scope });
  assert.equal(out.tasks.t1.status, 'delegated');
  assert.equal(out.tasks.t1.delegatedTo, 'cna-1');
  assert.deepEqual(out.staff['cna-1'].queue, ['t1']);
});

test('out-of-scope delegation remains open and records evidence', () => {
  const out = delegateTask(taskWorld(), { taskId: 't1', staffId: 'cna-1', scopePolicy: noScope });
  assert.equal(out.tasks.t1.status, 'open');
  assert.deepEqual(out.staff['cna-1'].queue, []);
  assert.ok(out.timeline.some(e => e.kind === 'DELEGATION_REJECTED_SCOPE'));
});

test('unavailable staff keeps delegated work queued until available', () => {
  let s = taskWorld({ ...staffFixture(), available: false });
  s = delegateTask(s, { taskId: 't1', staffId: 'cna-1', scopePolicy: scope });
  const delayed = advanceDelegatedTasks(s);
  assert.equal(delayed.tasks.t1.status, 'delegated');
  assert.deepEqual(delayed.staff['cna-1'].queue, ['t1']);
  assert.ok(delayed.timeline.some(e => e.kind === 'DELEGATION_DELAYED_UNAVAILABLE'));

  const available = setStaffAvailability(delayed, 'cna-1', true, 'returned');
  const started = advanceDelegatedTasks(available);
  assert.equal(started.tasks.t1.status, 'in_progress');
});

test('delegated work progresses across ticks and completes later', () => {
  let s = delegateTask(taskWorld(), { taskId: 't1', staffId: 'cna-1', scopePolicy: scope });
  s = advanceDelegatedTasks(s);
  assert.equal(s.tasks.t1.status, 'in_progress');
  assert.deepEqual(s.staff['cna-1'].queue, ['t1']);
  s = advanceDelegatedTasks(s);
  assert.equal(s.tasks.t1.status, 'complete');
  assert.deepEqual(s.staff['cna-1'].queue, []);
});

test('overloaded staff delays delegated work', () => {
  let s = taskWorld({ ...staffFixture(), workload: 4 });
  s = delegateTask(s, { taskId: 't1', staffId: 'cna-1', scopePolicy: scope });
  s = advanceDelegatedTasks(s, { maxWorkload: 3 });
  assert.equal(s.tasks.t1.status, 'delegated');
  assert.ok(s.timeline.some(e => e.kind === 'DELEGATION_DELAYED_OVERLOAD'));
});
