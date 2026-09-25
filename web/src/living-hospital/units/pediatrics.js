export const PEDIATRICS_UNIT = Object.freeze({
  id:'pediatrics',
  title:'Pediatrics',
  population:'Pediatric patients across developmental stages',
  environment:'Pediatric inpatient and acute-care learning environment with caregiver participation',
  learningFocus:['Age-adjusted assessment','Developmental communication','Caregiver partnership','Deterioration recognition','Medication-weight verification concepts'],
  staffingRoles:['rn','lpn','cna','charge-nurse','provider','respiratory-therapy','pediatric-support'],
  caseTemplates:[
    { id:'peds-respiratory', title:'Pediatric respiratory deterioration concept', scenarioId:'peds-respiratory-concept', learningObjectives:['Use age-adjusted assessment concepts','Recognize worsening work of breathing','Escalate to pediatric specialty support'], expectedActionIds:['assess','airway','oxygen','notify_provider','reassess'] },
    { id:'peds-safety', title:'Pediatric medication safety concept', scenarioId:'peds-medication-safety-concept', learningObjectives:['Verify weight before medication concepts','Use role and facility safety checks'], expectedActionIds:['assess','notify_provider','reassess'] }
  ],
  safety:{ educationalOnly:true, specialtyEscalationRequired:true, ageAdjustedAssessmentRequired:true, weightVerificationRequiredForMedicationConcepts:true }
});
