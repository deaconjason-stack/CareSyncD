import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompetencyLedger, recordCompetencyEvidence } from '../../src/living-hospital/competency-engine.js';
import { buildDebrief } from '../../src/living-hospital/debrief-engine.js';
import { buildReplayFrames, frameAtMinute } from '../../src/living-hospital/shift-replay.js';

function ledgerWithEvidence() {
  let ledger = createCompetencyLedger();
  ledger = recordCompetencyEvidence(ledger, { domain:'clinicalJudgment', sourceEventId:'evt-a', minute:10, outcome:'met', weight:2 });
  ledger = recordCompetencyEvidence(ledger, { domain:'operations', sourceEventId:'evt-b', minute:10, outcome:'partial', weight:1 });
  return ledger;
}

const timeline = [
  { id:'evt-a', minute:10, type:'ASSESSMENT', patientId:'p1', detail:'Change recognized' },
  { id:'evt-b', minute:10, type:'DELEGATION', patientId:'p2', detail:'Task delegated', sourceEventId:'evt-a' },
  { id:'evt-c', minute:12, type:'CRITICAL_ESCALATION', patientId:'p1', detail:'Escalation recorded', severity:'critical', sourceEventId:'evt-a' }
];

test('replay preserves original same-minute ordering with stable sequence indexes', () => {
  const frames = buildReplayFrames(timeline);
  assert.deepEqual(frames.map(f => [f.id,f.minute,f.sequence]), [
    ['evt-a',10,0],['evt-b',10,1],['evt-c',12,2]
  ]);
  assert.equal(frameAtMinute(frames, 10).id, 'evt-b');
});

test('replay preserves source links and is deterministic', () => {
  const one = buildReplayFrames(timeline);
  const two = buildReplayFrames(timeline);
  assert.equal(one[1].sourceEventId, 'evt-a');
  assert.equal(JSON.stringify(one), JSON.stringify(two));
});

test('debrief is evidence-backed and does not invent timeline events', () => {
  const ledger = ledgerWithEvidence();
  const debrief = buildDebrief({ timeline, competencyLedger:ledger, shiftSummary:{ score:84, unitId:'med-surg' } });
  assert.equal(debrief.timeline.length, timeline.length);
  assert.deepEqual(debrief.timeline.map(e => e.id), timeline.map(e => e.id));
  assert.equal(debrief.competencies.evidenceCount, 2);
  assert.deepEqual(debrief.competencies.evidence.map(e => e.sourceEventId), ['evt-a','evt-b']);
  assert.deepEqual(debrief.criticalEvents.map(e => e.id), ['evt-c']);
  assert.deepEqual(debrief.summary, { score:84, unitId:'med-surg' });
});
