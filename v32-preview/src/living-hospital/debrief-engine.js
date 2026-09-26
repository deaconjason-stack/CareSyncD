import { summarizeCompetencies } from './competency-engine.js';
import { buildReplayFrames } from './shift-replay.js';

function isCritical(event) {
  return event?.severity === 'critical' || /CRITICAL|CODE_BLUE|RAPID_RESPONSE/.test(String(event?.type ?? ''));
}

export function buildDebrief({ timeline = [], competencyLedger, shiftSummary = {} }) {
  const replayTimeline = buildReplayFrames(timeline);
  const domainSummary = summarizeCompetencies(competencyLedger ?? { evidence:[] });
  const evidence = (competencyLedger?.evidence ?? []).map(item => ({ ...item }));

  const strengths = [];
  const opportunities = [];
  for (const [domain, result] of Object.entries(domainSummary)) {
    if (result.evidenceCount === 0) continue;
    if (result.score >= 80) strengths.push({ domain, score:result.score });
    else opportunities.push({ domain, score:result.score });
  }

  return {
    timeline: replayTimeline,
    competencies: {
      ...domainSummary,
      evidence,
      evidenceCount:evidence.length
    },
    strengths,
    opportunities,
    criticalEvents: replayTimeline.filter(isCritical),
    summary:{ ...shiftSummary }
  };
}
