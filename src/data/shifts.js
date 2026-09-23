const shiftSets={
  med_surg:{id:'med_surg',title:'Med-Surg Pressure Shift',level:'Advanced',duration:480,startClock:420,summary:'Run a compressed 8-hour med-surg assignment with three evolving patients, timed care, interruptions and handoff.',scenarioIds:['hypoxia','hypoglycemia','dehydration'],events:[
    {at:18,kind:'task',category:'rounding',priority:'routine',patientIndex:0,title:'Post-op safety round',detail:'Pain, airway, fall risk and immediate needs.',dueIn:20,points:5,clinicalAction:'assess'},
    {at:35,kind:'task',category:'medication',priority:'high',patientIndex:1,title:'Time-sensitive glucose reassessment',detail:'Recheck after treatment and document response.',dueIn:20,points:8,clinicalAction:'reassess'},
    {at:55,kind:'call_light',patientIndex:2,title:'Call light: dizzy when standing',detail:'Samuel reports new dizziness while trying to get to the bathroom.',dueIn:12,points:7},
    {at:90,kind:'staffing',staffId:'tech-1',status:'Off unit',text:'Care tech pulled to another unit for 45 simulated minutes.'},
    {at:145,kind:'staffing',staffId:'tech-1',status:'Available',text:'Care tech returns to the unit.'},
    {at:210,kind:'task',category:'communication',priority:'routine',patientIndex:0,title:'Family update requested',detail:'Family asks for a concise update and next steps.',dueIn:35,points:5},
    {at:420,kind:'handoff'}
  ]},
  high_acuity:{id:'high_acuity',title:'High-Acuity Cross-Cover',level:'Expert',duration:420,startClock:1140,summary:'Cross-cover unstable patients while emergency events, calls and competing priorities arrive.',scenarioIds:['sepsis','stroke','opioid'],events:[
    {at:12,kind:'task',category:'medication',priority:'critical',patientIndex:0,title:'Sepsis bundle clock',detail:'Ordered cultures/therapy are time sensitive.',dueIn:25,points:10,clinicalAction:'antibiotics'},
    {at:28,kind:'provider_call',patientIndex:1,title:'Provider asks for stroke update',detail:'Prepare current neuro findings and escalation status.',dueIn:15,points:7,clinicalAction:'notify_provider'},
    {at:52,kind:'call_light',patientIndex:2,title:'Monitor alarm: respiratory rate falling',detail:'Urgent bedside reassessment is required.',dueIn:8,points:10,clinicalAction:'reassess'},
    {at:75,kind:'staffing',staffId:'rt-1',status:'Responding elsewhere',text:'Respiratory therapist is temporarily responding to another emergency.'},
    {at:118,kind:'staffing',staffId:'rt-1',status:'Available',text:'Respiratory therapist is available again.'},
    {at:180,kind:'task',category:'coordination',priority:'high',patientIndex:1,title:'CT transport coordination',detail:'Coordinate safe transport and monitoring for stroke imaging.',dueIn:25,points:7,delegateRoles:['Care Tech']},
    {at:360,kind:'handoff'}
  ]},
  hospital_day:{id:'hospital_day',title:'Full Hospital Day',level:'Mastery',duration:480,startClock:420,summary:'A full compressed hospital shift: admissions, timed medications, call lights, staffing changes, new orders, discharge readiness, family questions and end-of-shift handoff.',scenarioIds:['hypoxia','dehydration','hypoglycemia'],events:[
    {at:10,kind:'task',category:'rounding',priority:'routine',patientIndex:0,title:'Initial safety round',detail:'Confirm airway, fall risk, lines and immediate post-op needs.',dueIn:20,points:5,clinicalAction:'assess'},
    {at:20,kind:'task',category:'medication',priority:'high',patientIndex:2,title:'Hypoglycemia protocol window',detail:'Verify glucose and complete ordered treatment/recheck sequence.',dueIn:18,points:9,clinicalAction:'check_glucose'},
    {at:34,kind:'family',patientIndex:0,title:'Family question at bedside',detail:'Family is worried about the breathing change and asks what is happening.',dueIn:25,points:5},
    {at:48,kind:'call_light',patientIndex:1,title:'Call light: bathroom request',detail:'Patient is dizzy and wants to ambulate. Address safety before mobility.',dueIn:12,points:7,delegateRoles:['Care Tech']},
    {at:62,kind:'staffing',staffId:'tech-1',status:'Off unit',text:'Care tech is reassigned temporarily. Delegation capacity is reduced.'},
    {at:78,kind:'admission',scenarioId:'sepsis',text:'New admission arriving from the emergency department: suspected pneumonia with sepsis.'},
    {at:92,kind:'order',patientScenarioId:'sepsis',order:'Repeat lactate in 2 hours',title:'New order: repeat lactate',detail:'Provider enters a repeat lactate order.',dueIn:35,points:6,clinicalAction:'labs'},
    {at:125,kind:'staffing',staffId:'tech-1',status:'Available',text:'Care tech returns and can accept delegated tasks.'},
    {at:150,kind:'provider_call',patientScenarioId:'hypoxia',title:'Provider callback',detail:'Provider requests current oxygenation, respiratory effort and response to interventions.',dueIn:20,points:6,clinicalAction:'sbar'},
    {at:185,kind:'admission',scenarioId:'stroke',text:'Observation patient develops a sudden focal neurologic change and is added to your assignment.'},
    {at:210,kind:'task',category:'medication',priority:'high',patientScenarioId:'sepsis',title:'Antibiotic administration window',detail:'Administer the ordered antibiotic and confirm the infusion was started.',dueIn:30,points:9,clinicalAction:'antibiotics'},
    {at:245,kind:'task',category:'discharge',priority:'routine',patientScenarioId:'hypoglycemia',title:'Discharge readiness review',detail:'Verify stability, education and follow-up readiness before discharge.',dueIn:45,points:6},
    {at:285,kind:'family',patientScenarioId:'stroke',title:'Family asks about next steps',detail:'Give a concise, appropriate update based on the current simulation plan.',dueIn:30,points:5},
    {at:330,kind:'task',category:'reassessment',priority:'high',patientScenarioId:'sepsis',title:'Repeat perfusion reassessment',detail:'Trend BP, mental status, oxygenation and response to treatment.',dueIn:25,points:8,clinicalAction:'reassess'},
    {at:390,kind:'task',category:'coordination',priority:'routine',patientIndex:0,title:'Discharge/transfer planning',detail:'Review remaining barriers, pending results and disposition needs.',dueIn:35,points:5,delegateRoles:['Care Tech','RN Colleague']},
    {at:420,kind:'handoff'}
  ]}
};

export const SHIFTS = Object.freeze(Object.values(shiftSets).map(s => Object.freeze({...s, version:'3.0.0'})));
export function getShift(id){return SHIFTS.find(s=>s.id===id);}
export function publicShifts(){return SHIFTS.map(({scenarioIds,events,...x})=>({...x,patientCount:scenarioIds.length,mayAddPatients:(events||[]).filter(e=>e.kind==='admission').length,featureCount:(events||[]).length}));}
