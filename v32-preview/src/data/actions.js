const catalog = [
 {id:'assess',label:'Focused Assessment',group:'Assessment',domains:['assessment']},
 {id:'monitor',label:'Apply / Review Monitor',group:'Assessment',domains:['assessment','reassessment']},
 {id:'check_glucose',label:'Check Blood Glucose',group:'Assessment',domains:['assessment']},
 {id:'ecg_12lead',label:'Obtain 12-Lead ECG',group:'Assessment',domains:['assessment']},
 {id:'labs',label:'Obtain Ordered Labs',group:'Assessment',domains:['assessment']},
 {id:'airway',label:'Position / Support Airway',group:'Airway',domains:['safety','intervention']},
 {id:'oxygen',label:'Apply Oxygen',group:'Airway',domains:['intervention']},
 {id:'iv_access',label:'Establish IV Access',group:'Intervention',domains:['intervention']},
 {id:'iv_fluids',label:'Start IV Fluids',group:'Intervention',domains:['intervention']},
 {id:'dextrose',label:'Give Glucose / Dextrose',group:'Intervention',domains:['intervention']},
 {id:'antibiotics',label:'Administer Ordered Antibiotic',group:'Intervention',domains:['intervention']},
 {id:'naloxone',label:'Administer Naloxone',group:'Emergency',domains:['safety','intervention']},
 {id:'epinephrine',label:'Administer Epinephrine',group:'Emergency',domains:['safety','intervention']},
 {id:'stroke_alert',label:'Activate Stroke Alert',group:'Emergency',domains:['safety','communication']},
 {id:'call_code',label:'Activate Code Blue',group:'Emergency',domains:['safety','communication']},
 {id:'cpr',label:'Start High-Quality CPR',group:'Emergency',domains:['safety','intervention']},
 {id:'defibrillate',label:'Defibrillate',group:'Emergency',domains:['safety','intervention']},
 {id:'notify_provider',label:'Notify Provider / Escalate',group:'Communication',domains:['communication']},
 {id:'sbar',label:'Give SBAR Handoff',group:'Communication',domains:['communication']},
 {id:'reassess',label:'Reassess Response',group:'Reassessment',domains:['reassessment']}
];
export const ACTIONS = Object.freeze(catalog.map(x => Object.freeze({...x, domains:Object.freeze([...(x.domains||[])])})));
export const getAction = id => ACTIONS.find(a => a.id === id);
