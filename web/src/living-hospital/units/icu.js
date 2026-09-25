export const ICU_UNIT = Object.freeze({
  id:'icu',
  title:'Intensive Care Unit',
  population:'Critically ill adult inpatients',
  environment:'Critical care unit with high-acuity monitoring, rapid change, and transfer/disposition decisions',
  learningFocus:['Unstable physiology','Rapid reassessment','Critical escalation','Resource coordination','Disposition'],
  staffingRoles:['rn','charge-nurse','provider','respiratory-therapy','transport'],
  caseTemplates:[
    { id:'icu-sepsis', title:'Septic deterioration', scenarioId:'sepsis', learningObjectives:['Recognize worsening perfusion','Coordinate escalation'], expectedActionIds:['assess','labs','iv_access','iv_fluids','antibiotics','notify_provider','reassess'] },
    { id:'icu-opioid', title:'Respiratory depression', scenarioId:'opioid', learningObjectives:['Recognize ventilatory compromise','Escalate and reassess'], expectedActionIds:['assess','airway','naloxone','monitor','reassess'] },
    { id:'icu-arrest', title:'Cardiac arrest', scenarioId:'cardiac-arrest', learningObjectives:['Coordinate resuscitation response','Reassess after interventions'], expectedActionIds:['code_blue','cpr','defib','reassess'] }
  ],
  safety:{ educationalOnly:true, specialtyEscalationRequired:true }
});
