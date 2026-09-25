export const MED_SURG_UNIT = Object.freeze({
  id:'med-surg',
  title:'Med-Surg',
  population:'Adult inpatient',
  environment:'General medical-surgical inpatient unit',
  learningFocus:['Prioritization','Admissions and discharges','Delegation','Post-operative care','Deterioration recognition'],
  staffingRoles:['rn','lpn','cna','charge-nurse','provider','transport'],
  caseTemplates:[
    { id:'ms-hypoxia', title:'Post-op hypoxia', scenarioId:'hypoxia', learningObjectives:['Recognize respiratory decline','Escalate and reassess'], expectedActionIds:['assess','airway','oxygen','notify_provider','reassess'] },
    { id:'ms-dehydration', title:'Volume depletion', scenarioId:'dehydration', learningObjectives:['Assess perfusion','Coordinate fluid support and follow-up'], expectedActionIds:['assess','iv_access','iv_fluids','notify_provider','reassess'] },
    { id:'ms-hypoglycemia', title:'Symptomatic hypoglycemia', scenarioId:'hypoglycemia', learningObjectives:['Verify glucose','Treat and recheck'], expectedActionIds:['assess','check_glucose','dextrose','reassess'] }
  ],
  safety:{ educationalOnly:true, specialtyEscalationRequired:true }
});
