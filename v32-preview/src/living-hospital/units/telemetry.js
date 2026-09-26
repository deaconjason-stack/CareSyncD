export const TELEMETRY_UNIT = Object.freeze({
  id:'telemetry',
  title:'Telemetry / Step-Down',
  population:'Adult higher-acuity monitored inpatients',
  environment:'Monitored step-down unit with frequent reassessment and escalation',
  learningFocus:['Trend recognition','Higher-acuity reassessment','Escalation thresholds','Transfer readiness','Prioritization'],
  staffingRoles:['rn','lpn','cna','charge-nurse','provider','respiratory-therapy'],
  caseTemplates:[
    { id:'tele-hypoxia', title:'Worsening oxygenation', scenarioId:'hypoxia', learningObjectives:['Recognize respiratory trend','Escalate appropriately'], expectedActionIds:['assess','monitor','oxygen','notify_provider','reassess'] },
    { id:'tele-opioid', title:'Opioid-related respiratory depression', scenarioId:'opioid', learningObjectives:['Recognize sedation and respiratory decline','Escalate and reassess'], expectedActionIds:['assess','airway','naloxone','notify_provider','reassess'] },
    { id:'tele-arrest', title:'Cardiac arrest response', scenarioId:'cardiac-arrest', learningObjectives:['Recognize arrest','Activate resuscitation response'], expectedActionIds:['code_blue','cpr','defib'] }
  ],
  safety:{ educationalOnly:true, specialtyEscalationRequired:true }
});
