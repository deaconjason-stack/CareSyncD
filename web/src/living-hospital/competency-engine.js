const DOMAINS = Object.freeze(['clinicalJudgment','operations','communication','leadership']);
const OUTCOMES = new Set(['met','partial','missed']);

export function createCompetencyLedger() {
  return { evidence: [] };
}

export function recordCompetencyEvidence(ledger, evidence) {
  if (!DOMAINS.includes(evidence?.domain)) throw new Error('Invalid competency domain');
  if (typeof evidence?.sourceEventId !== 'string' || !evidence.sourceEventId.trim()) throw new Error('Competency evidence requires sourceEventId');
  if (!Number.isFinite(evidence?.minute) || evidence.minute < 0) throw new Error('Competency evidence requires minute');
  if (!OUTCOMES.has(evidence?.outcome)) throw new Error('Invalid competency outcome');
  if (!Number.isFinite(evidence?.weight) || evidence.weight <= 0) throw new Error('Competency evidence requires positive weight');

  const current = Array.isArray(ledger?.evidence) ? ledger.evidence : [];
  const record = Object.freeze({
    id: `competency-evidence-${current.length + 1}`,
    domain: evidence.domain,
    sourceEventId: evidence.sourceEventId,
    minute: evidence.minute,
    outcome: evidence.outcome,
    weight: evidence.weight
  });
  return { evidence: [...current, record] };
}

export function summarizeCompetencies(ledger) {
  const summary = Object.fromEntries(DOMAINS.map(domain => [domain, { met:0, partial:0, missed:0, score:0, evidenceCount:0 }]));
  for (const evidence of ledger?.evidence ?? []) {
    const bucket = summary[evidence.domain];
    if (!bucket) continue;
    bucket[evidence.outcome] += evidence.weight;
    bucket.evidenceCount += 1;
  }
  for (const domain of DOMAINS) {
    const bucket = summary[domain];
    const total = bucket.met + bucket.partial + bucket.missed;
    bucket.score = total > 0 ? Math.round(((bucket.met + (bucket.partial * 0.5)) / total) * 100) : 0;
  }
  return summary;
}

export function meetsCompetencyRequirements(summary, requirements = {}) {
  const blockers = [];
  for (const [domain, minimum] of Object.entries(requirements)) {
    if (!DOMAINS.includes(domain)) throw new Error(`Invalid competency requirement domain: ${domain}`);
    if (!Number.isFinite(minimum)) throw new Error(`Invalid competency minimum: ${domain}`);
    if ((summary?.[domain]?.score ?? 0) < minimum) blockers.push(domain);
  }
  return { met: blockers.length === 0, blockers };
}

export { DOMAINS as COMPETENCY_DOMAINS };
