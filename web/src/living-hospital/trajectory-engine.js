function clonePatient(patient) {
  return {
    ...patient,
    trajectory: { ...patient.trajectory }
  };
}

function latestDecision(state, patientId, type) {
  return (state.decisions ?? [])
    .filter(d => d.patientId === patientId && d.type === type)
    .sort((a, b) => b.minute - a.minute)[0] ?? null;
}

export function recordDecision(state, decision) {
  const decisions = state.decisions ?? [];
  const normalized = {
    ...decision,
    id: decision.id ?? `decision-${decisions.length + 1}`,
    minute: decision.minute ?? state.clock.minute
  };
  return {
    ...state,
    decisions: [...decisions, normalized],
    timeline: [
      ...state.timeline,
      {
        kind: 'DECISION',
        decisionId: normalized.id,
        patientId: normalized.patientId ?? null,
        actionType: normalized.type,
        minute: normalized.minute
      }
    ]
  };
}

export function advanceTrajectories(state, rng) {
  void rng;
  let timeline = [...state.timeline];
  let pendingConsequences = [...(state.pendingConsequences ?? [])];
  const patients = {};

  for (const [patientId, original] of Object.entries(state.patients ?? {})) {
    const patient = clonePatient(original);
    const definition = patient.trajectory?.definition;
    const currentState = patient.trajectory?.state;
    const rule = definition?.states?.[currentState];

    if (!rule) {
      patients[patientId] = patient;
      continue;
    }

    const reassess = latestDecision(state, patientId, 'REASSESS');
    const minute = state.clock.minute;
    let nextState = null;
    let evidenceKind = null;
    let sourceDecisionId = reassess?.id ?? null;

    if (reassess && Number.isFinite(rule.reassessByMinute) && reassess.minute <= rule.reassessByMinute && rule.onTime) {
      nextState = rule.onTime;
      evidenceKind = 'WINDOW_MET';
    } else if (
      Number.isFinite(rule.criticalByMinute) &&
      minute >= rule.criticalByMinute &&
      (!reassess || reassess.minute > rule.criticalByMinute) &&
      rule.critical
    ) {
      nextState = rule.critical;
      evidenceKind = 'CRITICAL_DETERIORATION';
      sourceDecisionId = reassess?.id ?? null;
    } else if (reassess && Number.isFinite(rule.reassessByMinute) && reassess.minute > rule.reassessByMinute && rule.late) {
      nextState = rule.late;
      evidenceKind = 'MISSED_WINDOW';
    }

    if (nextState && nextState !== currentState) {
      patient.trajectory = {
        ...patient.trajectory,
        state: nextState,
        branch: nextState
      };
      const evidence = {
        kind: evidenceKind,
        patientId,
        minute,
        fromState: currentState,
        toState: nextState,
        sourceDecisionId
      };
      if (Number.isFinite(rule.reassessByMinute)) evidence.dueMinute = rule.reassessByMinute;
      timeline.push(evidence);

      if (evidenceKind === 'MISSED_WINDOW' || evidenceKind === 'CRITICAL_DETERIORATION') {
        pendingConsequences.push({
          id: `consequence-${pendingConsequences.length + (state.resolvedConsequences?.length ?? 0) + 1}`,
          kind: evidenceKind,
          patientId,
          sourceDecisionId,
          createdMinute: minute,
          fromState: currentState,
          toState: nextState
        });
      }
    }

    patients[patientId] = patient;
  }

  return {
    ...state,
    patients,
    timeline,
    pendingConsequences
  };
}
