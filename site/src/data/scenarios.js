const scenarios = [
  {
    id:'hypoxia', title:'Acute Hypoxia', level:'Foundational', duration:260, acuity:'High',
    summary:'A post-operative patient develops worsening oxygenation and respiratory distress.',
    objectives:['Recognize falling SpO₂','Assess airway and breathing','Support oxygenation','Escalate and reassess'],
    patient:{name:'Morgan Reed',age:68,sex:'F',room:'204A',allergies:'NKDA',codeStatus:'Full Code',diagnosis:'Post-op day 1 - hip repair',
      vitals:{heartRate:104,systolicBP:138,diastolicBP:82,respiratoryRate:26,spo2:88,temperature:37.1,glucose:112},
      baseline:{heartRate:104,systolicBP:138,diastolicBP:82,respiratoryRate:26,spo2:88,temperature:37.1,glucose:112},
      symptoms:['Shortness of breath','Anxious','Using accessory muscles']},
    expected:['assess','airway','oxygen','monitor','notify_provider','reassess'],
    critical:['airway','oxygen'], sequence:[['assess','airway'],['airway','oxygen'],['oxygen','reassess']],
    orders:['Continuous pulse oximetry','Oxygen per protocol'], meds:[],
    labs:[['WBC','9.8 K/uL','4.0-11.0'],['Hgb','11.2 g/dL','12-16']], imaging:['Portable chest X-ray: mild bibasilar atelectasis.'],
    deterioration:{spo2:-0.18,heartRate:0.12,respiratoryRate:0.06},
    events:[{at:45,id:'fatigue',text:'Morgan says, “I am getting tired.” Respiratory effort is becoming less effective.',type:'danger',effects:{respiratoryRate:-2,spo2:-2}}]
  },
  {
    id:'dehydration', title:'Dehydration & Hypotension', level:'Foundational', duration:280, acuity:'Moderate',
    summary:'An older adult with poor oral intake becomes dizzy, tachycardic and hypotensive.',
    objectives:['Identify volume depletion','Assess perfusion','Restore circulating volume','Reassess response'],
    patient:{name:'Samuel Brooks',age:79,sex:'M',room:'118B',allergies:'Penicillin',codeStatus:'Full Code',diagnosis:'Gastroenteritis',
      vitals:{heartRate:112,systolicBP:88,diastolicBP:54,respiratoryRate:20,spo2:97,temperature:37.4,glucose:104},
      baseline:{heartRate:112,systolicBP:88,diastolicBP:54,respiratoryRate:20,spo2:97,temperature:37.4,glucose:104},
      symptoms:['Dizziness','Dry mucous membranes','Low urine output']},
    expected:['assess','iv_access','iv_fluids','monitor','notify_provider','reassess'], critical:['iv_fluids'], sequence:[['assess','iv_access'],['iv_access','iv_fluids']],
    orders:['0.9% NS bolus 500 mL','Strict I&O'], meds:['0.9% sodium chloride'],
    labs:[['BUN','34 mg/dL','7-20'],['Creatinine','1.6 mg/dL','0.6-1.3'],['Na','148 mmol/L','135-145']], imaging:['No imaging ordered.'],
    deterioration:{systolicBP:-0.09,heartRate:0.06},
    events:[{at:60,id:'near_syncope',text:'Samuel becomes pale and nearly faints when attempting to sit upright.',type:'danger',effects:{systolicBP:-6,heartRate:5}}]
  },
  {
    id:'hypoglycemia', title:'Symptomatic Hypoglycemia', level:'Intermediate', duration:230, acuity:'High',
    summary:'A patient receiving insulin becomes diaphoretic, shaky and confused.',
    objectives:['Recognize neuroglycopenic symptoms','Verify glucose','Treat hypoglycemia','Recheck after intervention'],
    patient:{name:'Avery Patel',age:52,sex:'F',room:'311C',allergies:'Sulfa',codeStatus:'Full Code',diagnosis:'Type 2 diabetes',
      vitals:{heartRate:108,systolicBP:128,diastolicBP:76,respiratoryRate:18,spo2:98,temperature:36.8,glucose:48},
      baseline:{heartRate:108,systolicBP:128,diastolicBP:76,respiratoryRate:18,spo2:98,temperature:36.8,glucose:48},
      symptoms:['Diaphoresis','Tremor','Confusion']},
    expected:['assess','check_glucose','dextrose','monitor','reassess'], critical:['check_glucose','dextrose'], sequence:[['assess','check_glucose'],['check_glucose','dextrose'],['dextrose','reassess']],
    orders:['Hypoglycemia protocol','Recheck glucose in 15 minutes'], meds:['Dextrose per protocol'],
    labs:[['Glucose','48 mg/dL','70-140'],['K','4.1 mmol/L','3.5-5.0']], imaging:['No imaging ordered.'], deterioration:{glucose:-0.10,heartRate:0.08},
    events:[{at:50,id:'mental_status',text:'Avery becomes increasingly difficult to arouse.',type:'danger',effects:{glucose:-4}}]
  },
  {
    id:'sepsis', title:'Sepsis Recognition', level:'Intermediate', duration:320, acuity:'High',
    summary:'A patient with suspected infection shows worsening perfusion and systemic inflammatory signs.',
    objectives:['Recognize sepsis indicators','Obtain focused assessment','Begin ordered treatment','Escalate rapidly'],
    patient:{name:'Jordan Kim',age:64,sex:'M',room:'407A',allergies:'NKDA',codeStatus:'Full Code',diagnosis:'Pneumonia',
      vitals:{heartRate:118,systolicBP:92,diastolicBP:58,respiratoryRate:28,spo2:92,temperature:39.1,glucose:138},
      baseline:{heartRate:118,systolicBP:92,diastolicBP:58,respiratoryRate:28,spo2:92,temperature:39.1,glucose:138},
      symptoms:['Fever','Confusion','Productive cough','Mottled skin']},
    expected:['assess','labs','iv_access','iv_fluids','antibiotics','monitor','notify_provider','reassess'], critical:['iv_fluids','antibiotics'], sequence:[['assess','labs'],['iv_access','iv_fluids'],['labs','antibiotics']],
    orders:['Lactate','Blood cultures x2','IV crystalloid','Broad-spectrum antibiotic'], meds:['IV crystalloid','Ceftriaxone (simulation)'],
    labs:[['WBC','17.8 K/uL','4.0-11.0'],['Lactate','3.8 mmol/L','0.5-2.2'],['Creatinine','1.7 mg/dL','0.6-1.3']], imaging:['Chest X-ray: right lower-lobe infiltrate.'],
    deterioration:{systolicBP:-0.12,heartRate:0.10,spo2:-0.04,temperature:0.001},
    events:[{at:75,id:'shock',text:'Urine output drops and mottling worsens. Perfusion is deteriorating.',type:'danger',effects:{systolicBP:-8,heartRate:6}}]
  },
  {
    id:'stroke', title:'Acute Stroke Alert', level:'Intermediate', duration:260, acuity:'High',
    summary:'A previously conversational patient develops sudden facial droop, arm weakness and slurred speech.',
    objectives:['Recognize focal neurologic deficit','Establish last-known-well','Check glucose','Activate stroke pathway'],
    patient:{name:'Denise Walker',age:71,sex:'F',room:'226A',allergies:'NKDA',codeStatus:'Full Code',diagnosis:'Observation for dizziness',
      vitals:{heartRate:88,systolicBP:176,diastolicBP:94,respiratoryRate:18,spo2:96,temperature:36.9,glucose:106},
      baseline:{heartRate:88,systolicBP:176,diastolicBP:94,respiratoryRate:18,spo2:96,temperature:36.9,glucose:106},
      symptoms:['Right facial droop','Right arm weakness','Slurred speech']},
    expected:['assess','check_glucose','monitor','stroke_alert','notify_provider','reassess'], critical:['stroke_alert'], sequence:[['assess','check_glucose'],['check_glucose','stroke_alert']],
    orders:['Stroke protocol','Non-contrast head CT','Frequent neurologic checks'], meds:[], labs:[['Glucose','106 mg/dL','70-140'],['INR','1.0','0.8-1.2']], imaging:['Head CT: pending.'], deterioration:{},
    events:[{at:70,id:'worsening_weakness',text:'Right-sided weakness progresses and speech becomes more difficult.',type:'danger',effects:{}}]
  },
  {
    id:'anaphylaxis', title:'Anaphylaxis', level:'Advanced', duration:210, acuity:'Critical',
    summary:'Minutes after a medication is given, the patient develops wheezing, hives and hypotension.',
    objectives:['Recognize anaphylaxis','Support airway and oxygenation','Give emergency medication','Escalate and reassess'],
    patient:{name:'Luis Martinez',age:43,sex:'M',room:'ED-12',allergies:'Unknown',codeStatus:'Full Code',diagnosis:'Cellulitis',
      vitals:{heartRate:126,systolicBP:82,diastolicBP:48,respiratoryRate:30,spo2:86,temperature:37.2,glucose:118},
      baseline:{heartRate:126,systolicBP:82,diastolicBP:48,respiratoryRate:30,spo2:86,temperature:37.2,glucose:118},
      symptoms:['Diffuse hives','Wheezing','Lip swelling','Feeling of impending doom']},
    expected:['assess','airway','oxygen','epinephrine','iv_access','iv_fluids','call_code','monitor','reassess'], critical:['epinephrine','airway'], sequence:[['assess','airway'],['airway','epinephrine']],
    orders:['Anaphylaxis emergency protocol','Continuous monitoring'], meds:['Epinephrine (simulation)','IV crystalloid'], labs:[], imaging:['No imaging indicated during initial stabilization.'],
    deterioration:{spo2:-0.2,systolicBP:-0.18,heartRate:0.12}, events:[{at:40,id:'airway_swelling',text:'Voice becomes hoarse and upper-airway swelling is worsening.',type:'danger',effects:{spo2:-3,systolicBP:-5}}]
  },
  {
    id:'opioid', title:'Opioid-Induced Respiratory Depression', level:'Advanced', duration:220, acuity:'Critical',
    summary:'A post-procedure patient becomes difficult to arouse with slow respirations and falling oxygen saturation.',
    objectives:['Recognize respiratory depression','Support airway','Escalate','Administer reversal agent and reassess'],
    patient:{name:'Renee Collins',age:57,sex:'F',room:'PACU-4',allergies:'NKDA',codeStatus:'Full Code',diagnosis:'Post-procedure pain control',
      vitals:{heartRate:58,systolicBP:104,diastolicBP:62,respiratoryRate:7,spo2:82,temperature:36.7,glucose:114},
      baseline:{heartRate:58,systolicBP:104,diastolicBP:62,respiratoryRate:7,spo2:82,temperature:36.7,glucose:114},
      symptoms:['Very drowsy','Pinpoint pupils','Shallow respirations']},
    expected:['assess','airway','oxygen','monitor','notify_provider','naloxone','reassess'], critical:['airway','naloxone'], sequence:[['assess','airway'],['airway','oxygen'],['oxygen','naloxone']],
    orders:['Respiratory monitoring','Opioid reversal protocol'], meds:['Naloxone (simulation)'], labs:[], imaging:['No imaging ordered.'],
    deterioration:{respiratoryRate:-0.04,spo2:-0.16,heartRate:-0.03}, events:[{at:50,id:'apnea',text:'Respirations become irregular with brief apneic pauses.',type:'danger',effects:{respiratoryRate:-2,spo2:-3}}]
  },
  {
    id:'cardiac_arrest', title:'Cardiac Arrest Response', level:'Advanced', duration:190, acuity:'Critical',
    summary:'A monitored patient becomes unresponsive and pulseless with a shockable rhythm.',
    objectives:['Activate emergency response','Start CPR','Recognize shockable rhythm','Defibrillate and reassess'],
    patient:{name:'Taylor Nguyen',age:59,sex:'F',room:'ICU-6',allergies:'NKDA',codeStatus:'Full Code',diagnosis:'Acute coronary syndrome',
      vitals:{heartRate:0,systolicBP:0,diastolicBP:0,respiratoryRate:0,spo2:72,temperature:36.9,glucose:126},
      baseline:{heartRate:0,systolicBP:0,diastolicBP:0,respiratoryRate:0,spo2:72,temperature:36.9,glucose:126}, symptoms:['Unresponsive','Pulseless','Apneic']},
    expected:['call_code','cpr','monitor','defibrillate','reassess'], critical:['call_code','cpr','defibrillate'], sequence:[['call_code','cpr'],['cpr','defibrillate']],
    orders:['Code blue protocol','Defibrillation per algorithm'], meds:['Emergency medications per protocol (simulation only)'],
    labs:[['K','4.8 mmol/L','3.5-5.0'],['Troponin','Elevated','Reference varies']], imaging:['Telemetry: ventricular fibrillation.'], deterioration:{spo2:-0.20}, events:[]
  }
];
export const SCENARIOS = Object.freeze(scenarios.map(s => Object.freeze({...s, version:'3.0.0'})));
export function publicScenarios(){return SCENARIOS.map(({patient,expected,critical,sequence,deterioration,events,...s})=>({...s,patient:{name:patient.name,age:patient.age,sex:patient.sex,diagnosis:patient.diagnosis}}));}
export function getScenario(id){return SCENARIOS.find(s=>s.id===id);}

