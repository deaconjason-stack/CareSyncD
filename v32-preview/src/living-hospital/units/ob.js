export const OB_UNIT = Object.freeze({
  id:'ob',
  title:'Obstetrics',
  population:'Maternal, labor, postpartum, and newborn-transition simulation concepts',
  environment:'Obstetric learning environment with specialty escalation and maternal-newborn transitions',
  learningFocus:['Maternal assessment','Fetal-status concepts','Labor and postpartum workflow','Specialty escalation','Newborn transition concepts'],
  staffingRoles:['rn','charge-nurse','provider','ob-specialty-support','newborn-support','transport'],
  caseTemplates:[
    { id:'ob-maternal-change', title:'Maternal deterioration concept', scenarioId:'ob-maternal-deterioration-concept', learningObjectives:['Recognize concerning maternal change','Escalate through specialty pathway'], expectedActionIds:['assess','monitor','notify_provider','reassess'] },
    { id:'ob-postpartum', title:'Postpartum escalation concept', scenarioId:'ob-postpartum-escalation-concept', learningObjectives:['Identify concerning postpartum findings','Coordinate specialty response'], expectedActionIds:['assess','monitor','notify_provider','reassess'] }
  ],
  safety:{ educationalOnly:true, specialtyEscalationRequired:true, maternalNewbornContext:true }
});
