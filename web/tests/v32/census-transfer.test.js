import test from 'node:test';
import assert from 'node:assert/strict';
import { baseWorld, patientFixture, blockedTransferWorld } from './helpers.js';
import { requestAdmission, markDischargeReady, advanceBedFlow } from '../../src/living-hospital/census-engine.js';
import { requestTransfer } from '../../src/living-hospital/transfer-engine.js';

test('transfer waits for bed, staffing, handoff, and transport', () => {
  const out = requestTransfer(blockedTransferWorld(), {
    patientId: 'p1', toUnit: 'icu', handoffReady: false, transportReady: false
  });
  assert.equal(out.transfers.p1.status, 'waiting');
  assert.deepEqual(out.transfers.p1.blockers.sort(), ['bed','handoff','staffing','transport']);
});

test('discharge completion opens a bed and waiting transfer completes on the operations tick', () => {
  let s = baseWorld({
    units: {
      'med-surg': { openBeds: 0, staffReady: true },
      icu: { openBeds: 0, staffReady: true }
    },
    patients: {
      p1: patientFixture('p1'),
      p2: { ...patientFixture('p2'), unitId: 'icu' }
    }
  });
  s = requestTransfer(s, { patientId: 'p1', toUnit: 'icu', handoffReady: true, transportReady: true });
  assert.deepEqual(s.transfers.p1.blockers, ['bed']);
  s = markDischargeReady(s, { patientId: 'p2' });
  assert.equal(s.transfers.p1.status, 'waiting');

  const out = advanceBedFlow(s);
  assert.equal(out.patients.p2.status, 'discharged');
  assert.equal(out.patients.p1.unitId, 'icu');
  assert.equal(out.transfers.p1.status, 'complete');
  assert.equal(out.units.icu.openBeds, 0);
  assert.equal(out.units['med-surg'].openBeds, 1);
});

test('admission consumes capacity only during bed-flow advancement', () => {
  const patient = { ...patientFixture('p3'), unitId: null };
  let s = baseWorld({ units: { 'med-surg': { openBeds: 1, staffReady: true } } });
  s = requestAdmission(s, { patient, toUnit: 'med-surg', handoffReady: true, transportReady: true });
  assert.equal(s.units['med-surg'].openBeds, 1);
  assert.equal(s.admissions.p3.status, 'ready');
  const out = advanceBedFlow(s);
  assert.equal(out.units['med-surg'].openBeds, 0);
  assert.equal(out.patients.p3.unitId, 'med-surg');
  assert.equal(out.admissions.p3.status, 'complete');
});
