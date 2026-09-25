import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION } from '../../src/domain/schema.js';
import { migrateRecord } from '../../src/persistence/migrations.js';

test('schema version is 32', () => {
  assert.equal(SCHEMA_VERSION, 32);
});

test('v1 learner migrates without losing progress', () => {
  const old = {
    schemaVersion:1,
    learnerId:'l1',
    displayName:'Nurse A',
    xp:120,
    rank:'Clinical Explorer',
    achievements:['a'],
    preferences:{difficulty:'guided'},
    competencyHistory:[{x:1}],
    createdAt:'a',
    updatedAt:'b'
  };
  const next = migrateRecord(old);
  assert.equal(next.schemaVersion, 32);
  assert.equal(next.learnerId, 'l1');
  assert.equal(next.xp, 120);
  assert.deepEqual(next.achievements, ['a']);
  assert.deepEqual(next.preferences, {difficulty:'guided'});
  assert.deepEqual(next.competencyHistory, [{x:1}]);
  old.achievements.push('later');
  assert.deepEqual(next.achievements, ['a']);
});

test('v1 run retains state', () => {
  const old = {
    schemaVersion:1,
    runId:'r1',
    kind:'shift',
    definitionId:'hospital_day',
    definitionVersion:'3.1',
    difficulty:'standard',
    startTime:'a',
    endTime:null,
    status:'active',
    state:{minute:44,patients:[{id:'p1'}]}
  };
  const next = migrateRecord(old);
  assert.equal(next.schemaVersion,32);
  assert.deepEqual(next.state,{minute:44,patients:[{id:'p1'}]});
  old.state.minute = 99;
  assert.equal(next.state.minute,44);
});

test('v32 record clones cleanly', () => {
  const record = {schemaVersion:32,runId:'r2',state:{minute:8}};
  const next = migrateRecord(record);
  assert.deepEqual(next,record);
  assert.notEqual(next,record);
  assert.notEqual(next.state,record.state);
});

test('unknown schema is rejected', () => {
  assert.throws(() => migrateRecord({schemaVersion:999}), /Unsupported schema version/);
  assert.throws(() => migrateRecord(null), /Invalid record/);
});
