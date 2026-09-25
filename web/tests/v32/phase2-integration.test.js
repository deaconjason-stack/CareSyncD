import test from 'node:test';
import assert from 'node:assert/strict';
import { listUnitDefinitions } from '../../src/living-hospital/unit-catalog.js';
import {
  createCompetencyLedger,
  recordCompetencyEvidence,
  summarizeCompetencies
} from '../../src/living-hospital/competency-engine.js';
import { evaluateCareerUnlock } from '../../src/living-hospital/progression-engine.js';
import { buildDebrief } from '../../src/living-hospital/debrief-engine.js';
import { buildReplayFrames } from '../../src/living-hospital/shift-replay.js';

test('Phase 2 acceptance ties specialties, competencies, progression, debrief, and replay together', () => {
  const units = listUnitDefinitions();
  assert.equal(units.length, 6);
  assert.deepEqual(units.map(unit => unit.id).sort(), ['ed','icu','med-surg','ob','pediatrics','telemetry']);

  let ledger = createCompetencyLedger();
  const domains = ['clinicalJudgment','operations','communication','leadership'];
  domains.forEach((domain, index) => {
    ledger = recordCompetencyEvidence(ledger, {
      domain,
      sourceEventId:`evt-${index + 1}`,
      minute:10 + index,
      outcome:'met',
      weight:100
    });
  });

  const competencySummary = summarizeCompetencies(ledger);
  const unlock = evaluateCareerUnlock({
    nodeId:'leadership-charge',
    completedNodeIds:['leadership-lead'],
    performance:{ overall:90 },
    competencySummary,
    xp:0
  });
  assert.equal(unlock.unlocked, true);
  assert.deepEqual(unlock.blockers, []);

  const timeline = ledger.evidence.map(evidence => ({
    id:evidence.sourceEventId,
    minute:evidence.minute,
    type:'COMPETENCY_EVIDENCE',
    domain:evidence.domain,
    outcome:evidence.outcome
  }));

  const debrief = buildDebrief({
    timeline,
    competencyLedger:ledger,
    shiftSummary:{ score:90, unitId:'med-surg', completed:true }
  });

  assert.equal(debrief.competencies.evidenceCount, 4);
  assert.deepEqual(buildReplayFrames(timeline), debrief.timeline);
});
