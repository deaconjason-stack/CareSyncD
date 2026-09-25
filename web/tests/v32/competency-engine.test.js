import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCompetencyLedger,
  recordCompetencyEvidence,
  summarizeCompetencies,
  meetsCompetencyRequirements
} from '../../src/living-hospital/competency-engine.js';

test('evidence requires one approved domain, source event, and minute', () => {
  let ledger = createCompetencyLedger();
  ledger = recordCompetencyEvidence(ledger, { domain:'communication', sourceEventId:'evt-12', minute:42, outcome:'met', weight:1 });
  const summary = summarizeCompetencies(ledger);
  assert.equal(summary.communication.met, 1);
  assert.equal(ledger.evidence[0].sourceEventId, 'evt-12');
  assert.equal(ledger.evidence[0].minute, 42);
});

test('invalid domain and missing provenance are rejected', () => {
  const ledger = createCompetencyLedger();
  assert.throws(() => recordCompetencyEvidence(ledger, { domain:'speed', sourceEventId:'evt-1', minute:1, outcome:'met', weight:1 }), /domain/i);
  assert.throws(() => recordCompetencyEvidence(ledger, { domain:'operations', minute:1, outcome:'met', weight:1 }), /source/i);
  assert.throws(() => recordCompetencyEvidence(ledger, { domain:'operations', sourceEventId:'evt-1', outcome:'met', weight:1 }), /minute/i);
});

test('partial and missed outcomes are summarized without masquerading as met evidence', () => {
  let ledger = createCompetencyLedger();
  ledger = recordCompetencyEvidence(ledger, { domain:'clinicalJudgment', sourceEventId:'evt-1', minute:10, outcome:'met', weight:2 });
  ledger = recordCompetencyEvidence(ledger, { domain:'clinicalJudgment', sourceEventId:'evt-2', minute:11, outcome:'partial', weight:2 });
  ledger = recordCompetencyEvidence(ledger, { domain:'clinicalJudgment', sourceEventId:'evt-3', minute:12, outcome:'missed', weight:2 });
  const summary = summarizeCompetencies(ledger);
  assert.equal(summary.clinicalJudgment.met, 2);
  assert.equal(summary.clinicalJudgment.partial, 2);
  assert.equal(summary.clinicalJudgment.missed, 2);
  assert.equal(summary.clinicalJudgment.score, 50);
});

test('competency requirements use domain scores and report blockers', () => {
  const summary = {
    clinicalJudgment:{score:90}, operations:{score:80}, communication:{score:75}, leadership:{score:60}
  };
  assert.deepEqual(meetsCompetencyRequirements(summary, { clinicalJudgment:80, operations:80, leadership:70 }), {
    met:false,
    blockers:['leadership']
  });
  assert.deepEqual(meetsCompetencyRequirements(summary, { clinicalJudgment:80, communication:70 }), {
    met:true,
    blockers:[]
  });
});
