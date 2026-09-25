import test from 'node:test';
import assert from 'node:assert/strict';
import { urgencyForPatient, computeCareerProfile, formatVital } from '../../src/ui/view-model.js';

test('patient urgency escalates from stable to critical using simulation vitals', () => {
  assert.equal(urgencyForPatient({vitals:{spo2:97,systolicBP:120,respiratoryRate:16,glucose:100}}),'stable');
  assert.equal(urgencyForPatient({vitals:{spo2:88,systolicBP:100,respiratoryRate:24,glucose:100}}),'urgent');
  assert.equal(urgencyForPatient({vitals:{spo2:74,systolicBP:64,respiratoryRate:4,glucose:28}}),'critical');
});

test('career profile preserves v3 XP/rank semantics from completed runs', () => {
  const profile=computeCareerProfile([{final:{score:90,scenario:{id:'hypoxia'}}},{final:{score:80,shift:{id:'hospital_day'}}}]);
  assert.equal(profile.runs,2);
  assert.equal(profile.best,90);
  assert.ok(profile.xp>=238);
  assert.equal(profile.rank,'Clinical Explorer');
});

test('vitals format with clinical units', () => {
  assert.equal(formatVital('spo2',91.4),'91.4%');
  assert.equal(formatVital('glucose',104),'104 mg/dL');
});
