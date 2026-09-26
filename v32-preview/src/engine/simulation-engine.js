import { getScenario } from '../data/scenarios.js';
import { ACTIONS as catalog } from '../data/actions.js';
const randomId=()=>globalThis.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=(n,d=0)=>Number(n.toFixed(d));
const clone=x=>JSON.parse(JSON.stringify(x));
const difficultyConfig={
  guided:{label:'Guided',deterioration:0.72,hints:true,wrongPenalty:2,sequencePenalty:2},
  standard:{label:'Standard',deterioration:1,hints:true,wrongPenalty:4,sequencePenalty:5},
  challenge:{label:'Challenge',deterioration:1.35,hints:false,wrongPenalty:6,sequencePenalty:8}
};

export class SimulationEngine {
  static create(options){return new SimulationEngine(options);}
  constructor({scenarioId, definition=null, learnerName='Learner', role='student', difficulty='standard', embedded=false}){
    const scenario=definition||getScenario(scenarioId); if(!scenario) throw new Error('Unknown scenario');
    this.id=randomId(); this.kind='scenario'; this.scenario=scenario; this.learnerName=String(learnerName).slice(0,80); this.role=role;
    this.difficulty=difficultyConfig[difficulty]?difficulty:'standard'; this.embedded=embedded;
    this.createdAt=new Date().toISOString(); this.elapsed=0; this.status='running'; this.score=0; this.maxScore=100;
    this.completedActions=[]; this.events=[]; this.triggeredEvents=[]; this.flags={}; this.feedback=[]; this.achievements=[]; this.hintsUsed=0;
    this.domainScores={assessment:0,intervention:0,safety:0,communication:0,reassessment:0};
    this.patient=clone(scenario.patient);
    this.chart={orders:[...scenario.orders],meds:[...scenario.meds],labs:scenario.labs.map(x=>[...x]),imaging:[...scenario.imaging],notes:[]};
    this.staff=[{name:'Dr. Adams',role:'Physician',status:'Available'},{name:'Nurse Kelly',role:'RN',status:'Assigned'},{name:'Alex Rivera',role:'Respiratory Therapist',status:'Available'}];
    this.addEvent(`${difficultyConfig[this.difficulty].label} scenario started`, 'system');
  }
  addEvent(text,type='info'){this.events.unshift({time:this.elapsed,text,type});this.events=this.events.slice(0,120);}
  has(id){return this.completedActions.includes(id);}
  addDomain(action,delta){for(const d of action.domains||[])this.domainScores[d]=clamp(this.domainScores[d]+delta,0,100);}
  sequenceViolation(id){
    for(const [before,after] of this.scenario.sequence||[]){if(id===after && !this.has(before)){const bl=catalog.find(a=>a.id===before)?.label||before.replaceAll('_',' '),al=catalog.find(a=>a.id===after)?.label||after.replaceAll('_',' ');return `Sequence concern: ${bl} should generally precede ${al} in this simulation.`;}}
    if(id==='defibrillate'&&!this.flags.cpr)return 'Defibrillation attempted before CPR was initiated in this scenario.';
    if(id==='iv_fluids'&&!this.flags.ivAccess)return 'Fluids were selected before IV access was established.';
    return null;
  }
  action(id){
    if(this.status!=='running')return {ok:false,message:'Scenario is not running.'};
    const action=catalog.find(a=>a.id===id);if(!action)return {ok:false,message:'Unknown action.'};
    if(this.has(id)){this.addEvent(`${action.label} repeated`,'neutral');return {ok:true,message:'Action already completed; no additional points.'};}
    const cfg=difficultyConfig[this.difficulty]; const expected=this.scenario.expected.includes(id); const violation=this.sequenceViolation(id);
    this.completedActions.push(id);
    if(expected){
      const pts=Math.max(6,Math.floor(100/this.scenario.expected.length));this.score=clamp(this.score+pts,0,100);this.addDomain(action,25);
      this.addEvent(action.label,'good');this.feedback.push({action:id,kind:'good',text:`Appropriate clinical priority: ${action.label}.`});
    }else{
      this.score=clamp(this.score-cfg.wrongPenalty,0,100);this.addDomain(action,-5);this.addEvent(`${action.label} — lower priority here`,'warn');
      this.feedback.push({action:id,kind:'warn',text:`${action.label} was not a primary objective for this scenario. Consider urgency and indication.`});
    }
    if(violation){this.score=clamp(this.score-cfg.sequencePenalty,0,100);this.domainScores.safety=clamp(this.domainScores.safety-cfg.sequencePenalty,0,100);this.addEvent(violation,'warn');this.feedback.push({action:id,kind:'warn',text:violation});}
    this.applyEffect(id);this.evaluateCompletion();return {ok:true,message:violation?violation:(expected?'Appropriate action recorded.':'Action recorded. Review prioritization in debrief.')};
  }
  applyEffect(id){const v=this.patient.vitals;
    if(id==='assess')this.flags.assessed=true;
    if(id==='monitor')this.flags.monitored=true;
    if(id==='reassess'){this.flags.reassessed=true;this.chart.notes.unshift(`Reassessment at ${this.elapsed}s: HR ${round(v.heartRate)}, BP ${round(v.systolicBP)}/${round(v.diastolicBP)}, RR ${round(v.respiratoryRate)}, SpO₂ ${round(v.spo2,1)}%.`);}
    if(id==='airway'){this.flags.airway=true;v.spo2=clamp(v.spo2+2,45,100);v.respiratoryRate=clamp(v.respiratoryRate+1,0,50);}
    if(id==='oxygen'){this.flags.oxygen=true;v.spo2=clamp(v.spo2+6,45,100);v.respiratoryRate=clamp(v.respiratoryRate-2,0,50);}
    if(id==='iv_access')this.flags.ivAccess=true;
    if(id==='iv_fluids'){this.flags.fluids=true;v.systolicBP=clamp(v.systolicBP+12,0,190);v.diastolicBP=clamp(v.diastolicBP+7,0,120);v.heartRate=clamp(v.heartRate-6,0,180);}
    if(id==='dextrose'){this.flags.dextrose=true;v.glucose=clamp(v.glucose+48,20,300);v.heartRate=clamp(v.heartRate-5,0,180);}
    if(id==='antibiotics'){this.flags.antibiotics=true;this.chart.notes.unshift('Ordered antibiotic administered in simulation.');}
    if(id==='naloxone'){this.flags.naloxone=true;v.respiratoryRate=clamp(v.respiratoryRate+8,0,30);v.spo2=clamp(v.spo2+8,45,100);v.heartRate=clamp(v.heartRate+10,0,180);this.patient.symptoms=this.patient.symptoms.filter(x=>x!=='Very drowsy');}
    if(id==='epinephrine'){this.flags.epinephrine=true;v.systolicBP=clamp(v.systolicBP+22,0,190);v.diastolicBP=clamp(v.diastolicBP+10,0,120);v.spo2=clamp(v.spo2+5,45,100);v.respiratoryRate=clamp(v.respiratoryRate-5,0,50);}
    if(id==='stroke_alert'){this.flags.strokeAlert=true;this.staff[0].status='Responding';this.chart.imaging[0]='Head CT: transport activated; result pending.';}
    if(id==='call_code'){this.flags.code=true;this.staff.forEach(x=>x.status='Responding');}
    if(id==='cpr'){this.flags.cpr=true;v.systolicBP=55;v.diastolicBP=25;v.spo2=clamp(v.spo2+4,45,100);}
    if(id==='defibrillate'&&this.flags.cpr){this.flags.shocked=true;v.heartRate=92;v.systolicBP=108;v.diastolicBP=68;v.respiratoryRate=14;v.spo2=92;this.addEvent('Return of spontaneous circulation simulated','good');}
    if(id==='check_glucose'){this.flags.glucoseChecked=true;this.chart.notes.unshift(`POC glucose: ${round(v.glucose)} mg/dL`);}
    if(id==='ecg_12lead'){this.flags.ecg=true;this.chart.notes.unshift(`12-lead ECG obtained: ${this.rhythm()}.`);}
    if(id==='labs'){this.flags.labs=true;this.chart.notes.unshift('Ordered laboratory specimens collected in simulation.');}
    if(id==='notify_provider'){this.flags.escalated=true;this.staff[0].status='Notified';}
    if(id==='sbar'){this.flags.sbar=true;this.chart.notes.unshift('SBAR handoff completed.');}
  }
  addNote(text){const clean=String(text||'').trim().slice(0,500);if(!clean)return false;this.chart.notes.unshift(`${this.learnerName}: ${clean}`);this.addEvent('Learner note added','neutral');return true;}
  hint(){
    const cfg=difficultyConfig[this.difficulty];if(!cfg.hints)return {ok:false,message:'Hints are disabled in Challenge mode.'};
    const next=this.scenario.expected.find(x=>!this.has(x));if(!next)return {ok:false,message:'All core actions have been completed.'};
    const a=catalog.find(x=>x.id===next);this.hintsUsed++;this.score=clamp(this.score-4,0,100);this.addEvent('Clinical reasoning hint used (-4)','warn');
    const prompts={assess:'Start with what you can directly assess right now.',airway:'Think ABCs: what threatens oxygen delivery first?',oxygen:'Look at oxygenation and respiratory distress.',check_glucose:'A rapid reversible cause can mimic neurologic decline.',dextrose:'The measured glucose requires prompt correction in this simulation.',iv_access:'What access will you need before ordered IV therapy?',iv_fluids:'Perfusion is poor. What ordered intervention supports circulation?',labs:'What ordered data should be collected before therapy when feasible?',antibiotics:'Infection plus organ dysfunction requires timely ordered treatment.',stroke_alert:'Sudden focal deficits are time-sensitive.',naloxone:'Consider a reversible cause of slow respirations and pinpoint pupils.',epinephrine:'Airway swelling, wheeze and hypotension point to a time-critical emergency medication.',call_code:'This patient needs the emergency response team now.',cpr:'There is no effective pulse. What restores circulation immediately?',defibrillate:'A shockable rhythm is present after CPR has begun.',notify_provider:'Who else needs to know about this deterioration?',monitor:'Continuous data can reveal whether your interventions are working.',reassess:'After intervening, determine whether the patient actually improved.'};
    return {ok:true,message:prompts[next]||`Consider whether ${a?.label||next} should be your next priority.`};
  }
  _tickOne(){
    if(this.status!=='running')return;this.elapsed+=1;const v=this.patient.vitals,d=this.scenario.deterioration,cfg=difficultyConfig[this.difficulty];
    const stabilized=this.isTreatmentEffective();
    if(!stabilized){for(const [k,delta] of Object.entries(d))if(typeof v[k]==='number')v[k]+=delta*cfg.deterioration;}else{
      if(v.heartRate>95)v.heartRate-=0.06;if(v.spo2<98)v.spo2+=0.05;if(v.systolicBP>0&&v.systolicBP<118)v.systolicBP+=0.05;if(this.scenario.id==='sepsis'&&v.temperature>37.8)v.temperature-=0.004;
    }
    for(const e of this.scenario.events||[]){if(this.elapsed>=e.at&&!this.triggeredEvents.includes(e.id)){this.triggeredEvents.push(e.id);this.addEvent(e.text,e.type||'warn');for(const [k,val] of Object.entries(e.effects||{}))if(typeof v[k]==='number')v[k]+=val;}}
    v.heartRate=round(clamp(v.heartRate,0,220));v.systolicBP=round(clamp(v.systolicBP,0,220));v.diastolicBP=round(clamp(v.diastolicBP,0,140));v.respiratoryRate=round(clamp(v.respiratoryRate,0,50));v.spo2=round(clamp(v.spo2,45,100),1);v.temperature=round(clamp(v.temperature,34,42),1);v.glucose=round(clamp(v.glucose,20,500));
    if(this.elapsed%30===0)this.addEvent('Reassessment checkpoint due','neutral');if(this.elapsed>=this.scenario.duration)this.finish('time');this.evaluateSafety();this.evaluateCompletion();
  }
  isTreatmentEffective(){if(this.scenario.id==='hypoxia')return this.flags.airway&&this.flags.oxygen;if(this.scenario.id==='dehydration')return this.flags.fluids;if(this.scenario.id==='hypoglycemia')return this.flags.dextrose;if(this.scenario.id==='sepsis')return this.flags.fluids&&this.flags.antibiotics;if(this.scenario.id==='stroke')return this.flags.strokeAlert;if(this.scenario.id==='anaphylaxis')return this.flags.epinephrine&&this.flags.airway;if(this.scenario.id==='opioid')return this.flags.naloxone&&this.flags.airway;if(this.scenario.id==='cardiac_arrest')return this.flags.shocked;return false;}
  evaluateSafety(){const v=this.patient.vitals;if((v.spo2<=75||(v.systolicBP>0&&v.systolicBP<=65)||v.glucose<=30||v.respiratoryRate<=4)&&!this.flags.criticalWarn){this.flags.criticalWarn=true;this.domainScores.safety=clamp(this.domainScores.safety-10,0,100);this.addEvent('Critical deterioration — immediate reassessment required','danger');}}
  evaluateCompletion(){if(this.scenario.expected.every(a=>this.has(a))){if(!this.achievements.includes('Core Objectives Complete'))this.achievements.push('Core Objectives Complete');if(this.isStable())this.finish('objectives');}}
  isStable(){const v=this.patient.vitals;if(this.scenario.id==='cardiac_arrest')return this.flags.shocked&&v.heartRate>0;if(this.scenario.id==='hypoglycemia')return v.glucose>=70;if(this.scenario.id==='stroke')return this.flags.strokeAlert&&this.flags.reassessed;if(this.scenario.id==='opioid')return v.respiratoryRate>=10&&v.spo2>=90;if(this.scenario.id==='anaphylaxis')return v.systolicBP>=90&&v.spo2>=90;return v.spo2>=90&&(v.systolicBP===0||v.systolicBP>=85);}
  finish(reason='manual'){
    if(this.status==='complete')return;this.status='complete';this.finishReason=reason;
    if(reason==='objectives'&&this.elapsed<100)this.achievements.push('Rapid Response');if(this.hintsUsed===0)this.achievements.push('Independent Thinker');
    if((this.scenario.critical||[]).every(x=>this.has(x)))this.achievements.push('Safety First');if(this.flags.reassessed)this.achievements.push('Closed the Loop');
    this.score=clamp(this.score+(this.flags.reassessed?5:0)+(this.flags.sbar?3:0),0,100);this.addEvent('Scenario complete — debrief available','system');
  }
  pause(){if(this.status==='running'){this.status='paused';this.addEvent('Simulation paused by instructor','system');}}
  resume(){if(this.status==='paused'){this.status='running';this.addEvent('Simulation resumed','system');}}
  rhythm(){const v=this.patient.vitals;if(this.scenario.id==='cardiac_arrest'&&!this.flags.shocked)return 'Ventricular Fibrillation';if(v.heartRate===0)return 'Asystole';if(v.heartRate>110)return 'Sinus Tachycardia';if(v.heartRate<60&&v.heartRate>0)return 'Sinus Bradycardia';return 'Sinus Rhythm';}
  debrief(){const missed=this.scenario.expected.filter(x=>!this.has(x));const criticalMissed=(this.scenario.critical||[]).filter(x=>!this.has(x));return {missed,criticalMissed,hintsUsed:this.hintsUsed,finishReason:this.finishReason||null,grade:this.score>=90?'Distinguished':this.score>=80?'Proficient':this.score>=65?'Developing':'Needs Review',domainScores:this.domainScores};}
  public(){const v=this.patient.vitals;return {id:this.id,kind:this.kind,scenario:{id:this.scenario.id,title:this.scenario.title,level:this.scenario.level,acuity:this.scenario.acuity,summary:this.scenario.summary,objectives:this.scenario.objectives},learnerName:this.learnerName,role:this.role,difficulty:this.difficulty,createdAt:this.createdAt,elapsed:this.elapsed,status:this.status,score:this.score,maxScore:this.maxScore,patient:this.patient,chart:this.chart,staff:this.staff,completedActions:this.completedActions,events:this.events,feedback:this.feedback,achievements:this.achievements,hintsUsed:this.hintsUsed,actions:catalog,domainScores:this.domainScores,debrief:this.debrief(),physiology:{cardiovascular:v.systolicBP===0?'No perfusing pressure':v.systolicBP<90?'Low perfusion':'Perfusing',respiratory:v.respiratoryRate<=8?'Severely depressed':v.spo2<90?'Compromised':'Supported',neurologic:v.glucose<60?'At risk':this.scenario.id==='stroke'?'Focal deficit present':'Responsive',metabolic:v.temperature>=38?'Inflammatory stress':'Stable'},rhythm:this.rhythm()};}
  tick(minutes=1){const count=Math.max(0,Math.floor(Number(minutes)||0));for(let i=0;i<count;i++)this._tickOne();return this.snapshot();}
  performAction(id){return this.action(id);}
  requestHint(){return this.hint();}
  snapshot(){return clone(this.public());}
  serialize(){return clone({schemaVersion:1,id:this.id,kind:this.kind,definitionId:this.scenario.id,definitionVersion:this.scenario.version||'3.0.0',learnerName:this.learnerName,role:this.role,difficulty:this.difficulty,embedded:this.embedded,createdAt:this.createdAt,elapsed:this.elapsed,status:this.status,score:this.score,maxScore:this.maxScore,completedActions:this.completedActions,events:this.events,triggeredEvents:this.triggeredEvents,flags:this.flags,feedback:this.feedback,achievements:this.achievements,hintsUsed:this.hintsUsed,domainScores:this.domainScores,patient:this.patient,chart:this.chart,staff:this.staff,finishReason:this.finishReason||null});}
  static restore(state){const definition=getScenario(state.definitionId);if(!definition)throw new Error('Unknown scenario in saved state');const x=SimulationEngine.create({definition,learnerName:state.learnerName,role:state.role,difficulty:state.difficulty,embedded:state.embedded});for(const key of ['id','createdAt','elapsed','status','score','maxScore','completedActions','events','triggeredEvents','flags','feedback','achievements','hintsUsed','domainScores','patient','chart','staff','finishReason'])if(state[key]!==undefined)x[key]=clone(state[key]);return x;}
}
export { difficultyConfig };
