export const EMERGENCY_UNIT = Object.freeze({
  id:'ed',
  title:'Emergency Department',
  population:'All-acuity emergency presentations',
  environment:'Emergency department with variable arrivals, triage, diagnostics, boarding, and disposition pressure',
  learningFocus:['Triage','Rapid assessment','Competing priorities','Disposition','Surge management'],
  staffingRoles:['rn','lpn','cna','charge-nurse','provider','respiratory-therapy','transport'],
  caseTemplates:[
    { id:'ed-sepsis', title:'Sepsis recognition', scenarioId:'sepsis', learningObjectives:['Recognize systemic deterioration','Escalate time-sensitive care'], expectedActionIds:['assess','labs','iv_access','iv_fluids','antibiotics','notify_provider','reassess'] },
    { id:'ed-stroke', title:'Acute stroke alert', scenarioId:'stroke', learningObjectives:['Recognize focal neurologic change','Activate escalation pathway'], expectedActionIds:['assess','stroke_alert','notify_provider','reassess'] },
    { id:'ed-anaphylaxis', title:'Anaphylaxis', scenarioId:'anaphylaxis', learningObjectives:['Recognize airway threat','Escalate immediately'], expectedActionIds:['assess','airway','epinephrine','oxygen','notify_provider','reassess'] }
  ],
  safety:{ educationalOnly:true, specialtyEscalationRequired:true }
});
