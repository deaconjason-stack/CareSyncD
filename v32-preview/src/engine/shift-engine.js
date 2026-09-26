import { SimulationEngine } from './simulation-engine.js';
import { SHIFTS, getShift } from '../data/shifts.js';
const shiftSets=Object.fromEntries(SHIFTS.map(s=>[s.id,s]));
const randomId=()=>globalThis.crypto?.randomUUID?.() || `shift-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export class ShiftEngine{
  static create(options){return new ShiftEngine(options);}
  constructor({shiftId='med_surg',definition=null,learnerName='Learner',role='student',difficulty='standard'}){
    const def=definition||getShift(shiftId);if(!def)throw new Error('Unknown shift');
    this.id=randomId();this.kind='shift';this.def=def;this.learnerName=String(learnerName).slice(0,80);this.role=role;this.difficulty=difficulty;
    this.elapsed=0;this.status='running';this.createdAt=new Date().toISOString();this.events=[];this.achievements=[];this.switches=0;this.operationsScore=100;this.triggeredShiftEvents=[];this.tasks=[];this.interruptions=[];this.taskCounter=0;this.patientMeta={};
    this.staff=[
      {id:'rn-1',name:'Taylor Morgan',role:'RN Colleague',status:'Available',load:0},
      {id:'tech-1',name:'Jamie Chen',role:'Care Tech',status:'Available',load:0},
      {id:'rt-1',name:'Alex Rivera',role:'Respiratory Therapist',status:'Available',load:0},
      {id:'provider-1',name:'Dr. Adams',role:'Physician',status:'Available',load:0}
    ];
    this.patientSessions=def.scenarioIds.map(id=>this.makePatient(id,'start'));
    this.activePatientId=this.patientSessions[0].id;
    this.addEvent(`Shift started at ${this.clock()} — all assigned patients continue evolving while you work.`,'system');
    this.seedTasks();
  }
  makePatient(scenarioId,source='admission'){
    const p=new SimulationEngine({scenarioId,learnerName:this.learnerName,role:this.role,difficulty:this.difficulty,embedded:true});
    this.patientMeta[p.id]={source,admittedAt:this.elapsed,disposition:'Assigned'};return p;
  }
  clock(minute=this.elapsed){const total=(this.def.startClock+minute)%1440;return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;}
  addEvent(text,type='info'){this.events.unshift({time:this.elapsed,clock:this.clock(),text,type});this.events=this.events.slice(0,180);}
  patient(id){return this.patientSessions.find(x=>x.id===id);}
  findPatientByScenario(scenarioId){return this.patientSessions.find(x=>x.scenario.id===scenarioId);}
  resolvePatient(spec={}){if(spec.patientId)return this.patient(spec.patientId);if(Number.isInteger(spec.patientIndex))return this.patientSessions[spec.patientIndex];if(spec.patientScenarioId)return this.findPatientByScenario(spec.patientScenarioId);return null;}
  selectPatient(id){if(!this.patient(id))return false;if(this.activePatientId!==id){this.activePatientId=id;this.switches++;this.addEvent(`Focus changed to ${this.patient(id).patient.name}`,'neutral');}return true;}
  seedTasks(){this.patientSessions.forEach((p,i)=>this.createTask({patientId:p.id,category:'rounding',priority:i===0?'high':'routine',title:'Opening assessment',detail:'Complete an opening focused assessment and establish priorities.',dueIn:30+i*8,points:5,clinicalAction:'assess'}));}
  createTask(spec={}){
    const p=this.resolvePatient(spec);const task={id:`task-${++this.taskCounter}`,title:spec.title||'Shift task',detail:spec.detail||'',patientId:p?.id||spec.patientId||null,patientName:p?.patient.name||null,category:spec.category||'coordination',priority:spec.priority||'routine',createdAt:this.elapsed,dueAt:this.elapsed+Math.max(1,Number(spec.dueIn||30)),status:'open',points:Number(spec.points||5),clinicalAction:spec.clinicalAction||null,delegateRoles:clone(spec.delegateRoles||[]),delegatedTo:null,delegatedFinishAt:null,consequenceApplied:false,completedAt:null};
    this.tasks.push(task);this.addEvent(`${task.priority==='critical'?'URGENT: ':''}${task.title}${task.patientName?` — ${task.patientName}`:''}`,task.priority==='critical'?'danger':task.priority==='high'?'warn':'info');return task;
  }
  action(actionId,patientId){const p=this.patient(patientId||this.activePatientId);if(!p)return {ok:false,message:'Patient not found.'};if(this.status!=='running')return {ok:false,message:'Shift is not running.'};const r=p.action(actionId);this.addEvent(`${p.patient.name}: ${r.message}`,r.ok?'info':'warn');this.autoCompleteClinicalTasks(p.id,actionId);this.evaluateCompletion();return r;}
  autoCompleteClinicalTasks(patientId,actionId){for(const t of this.tasks){if(t.status==='open'&&t.patientId===patientId&&t.clinicalAction===actionId)this.completeTaskInternal(t,`Clinical action completed: ${actionId}`);}}
  taskCommand(taskId,command='complete',staffId=null){if(this.status!=='running')return {ok:false,message:'Shift is not running.'};const t=this.tasks.find(x=>x.id===taskId);if(!t)return {ok:false,message:'Task not found.'};if(['completed','missed'].includes(t.status))return {ok:false,message:'Task is already closed.'};
    if(command==='complete'){
      if(t.clinicalAction)return {ok:false,message:'This task closes automatically when the required clinical action is completed for that patient.'};
      this.completeTaskInternal(t,'Task completed by learner');return {ok:true,message:`Completed: ${t.title}`};
    }
    if(command==='delegate'){
      if(!t.delegateRoles.length)return {ok:false,message:'This task is not appropriate for delegation in this simulation.'};
      const staff=this.staff.find(s=>s.id===staffId);if(!staff||staff.status!=='Available')return {ok:false,message:'Selected team member is not available.'};if(!t.delegateRoles.includes(staff.role))return {ok:false,message:`${staff.role} is not an eligible delegate for this task.`};
      t.status='delegated';t.delegatedTo=staff.id;t.delegatedFinishAt=Math.min(t.dueAt,this.elapsed+8);staff.load++;this.addEvent(`${t.title} delegated to ${staff.name}`,'good');return {ok:true,message:`Delegated to ${staff.name}. You remain accountable for follow-through.`};
    }
    return {ok:false,message:'Unknown task command.'};
  }
  completeTaskInternal(t,reason='Completed'){
    if(['completed','missed'].includes(t.status))return;t.status='completed';t.completedAt=this.elapsed;const late=this.elapsed>t.dueAt;this.operationsScore=clamp(this.operationsScore+(late?Math.ceil(t.points/3):Math.ceil(t.points/2)),0,100);if(t.delegatedTo){const st=this.staff.find(s=>s.id===t.delegatedTo);if(st)st.load=Math.max(0,st.load-1);}this.addEvent(`${t.title} completed${late?' (late)':''}`,'good');
  }
  applyMissedTask(t){if(t.consequenceApplied||['completed','missed'].includes(t.status))return;t.consequenceApplied=true;t.status='missed';this.operationsScore=clamp(this.operationsScore-Math.max(4,t.points),0,100);if(t.delegatedTo){const st=this.staff.find(s=>s.id===t.delegatedTo);if(st)st.load=Math.max(0,st.load-1);}const p=t.patientId?this.patient(t.patientId):null;if(p){const v=p.patient.vitals;if(t.category==='rounding'||t.category==='reassessment'){v.heartRate=Math.min(220,v.heartRate+5);if(v.spo2)v.spo2=Math.max(45,v.spo2-1);}if(t.category==='medication'){v.heartRate=Math.min(220,v.heartRate+7);if(p.scenario.id==='hypoglycemia')v.glucose=Math.max(20,v.glucose-5);if(p.scenario.id==='sepsis')v.systolicBP=Math.max(0,v.systolicBP-5);}}
    this.addEvent(`Missed task: ${t.title}. A delayed-care consequence was applied.`,'danger');
  }
  hint(patientId){const p=this.patient(patientId||this.activePatientId);return p?p.hint():{ok:false,message:'Patient not found.'};}
  addNote(patientId,text){const p=this.patient(patientId||this.activePatientId);return !!p&&p.addNote(text);}
  triggerEvent(e){this.triggeredShiftEvents.push(`${e.at}:${e.kind}:${e.title||e.scenarioId||e.text||''}`);const p=this.resolvePatient(e);
    if(e.kind==='task')return this.createTask(e);
    if(e.kind==='call_light'||e.kind==='family'||e.kind==='provider_call'){
      const task=this.createTask({...e,category:e.kind==='call_light'?'safety':e.kind==='family'?'communication':'communication',priority:e.kind==='call_light'?'high':e.priority||'routine'});this.interruptions.unshift({id:task.id,type:e.kind,title:e.title,patientName:task.patientName,at:this.elapsed,status:'open'});this.interruptions=this.interruptions.slice(0,20);return;
    }
    if(e.kind==='staffing'){const s=this.staff.find(x=>x.id===e.staffId);if(s)s.status=e.status;this.addEvent(e.text||`Staffing update: ${s?.name||e.staffId} — ${e.status}`,'warn');return;}
    if(e.kind==='admission'){
      const np=this.makePatient(e.scenarioId,'new admission');this.patientSessions.push(np);this.addEvent(`${e.text||'New admission'} Assigned patient: ${np.patient.name} (${np.patient.room}).`,'danger');this.createTask({patientId:np.id,category:'admission',priority:'high',title:'New admission assessment',detail:'Review chart, establish baseline assessment and immediate priorities.',dueIn:25,points:9,clinicalAction:'assess'});this.createTask({patientId:np.id,category:'coordination',priority:'routine',title:'Admission orders review',detail:'Review current orders, labs and immediate safety needs.',dueIn:40,points:5});return;
    }
    if(e.kind==='order'&&p){p.chart.orders.unshift(e.order);this.createTask({...e,patientId:p.id,category:'order',priority:e.priority||'high'});this.addEvent(`${p.patient.name}: new order — ${e.order}`,'warn');return;}
    if(e.kind==='handoff'){
      this.addEvent('End-of-shift handoff window opened. Complete SBAR for each active patient.','system');for(const pt of this.patientSessions){if(this.patientMeta[pt.id]?.disposition!=='Discharged')this.createTask({patientId:pt.id,category:'handoff',priority:'high',title:'End-of-shift SBAR handoff',detail:'Communicate situation, background, assessment and recommendation.',dueIn:50,points:8,clinicalAction:'sbar'});}return;
    }
  }
  _tickOne(){if(this.status!=='running')return;this.elapsed++;for(const p of this.patientSessions){if(this.patientMeta[p.id]?.disposition!=='Discharged')p.tick();}
    for(const e of this.def.events||[]){const key=`${e.at}:${e.kind}:${e.title||e.scenarioId||e.text||''}`;if(this.elapsed>=e.at&&!this.triggeredShiftEvents.includes(key))this.triggerEvent(e);}
    for(const t of this.tasks){if(t.status==='delegated'&&this.elapsed>=t.delegatedFinishAt)this.completeTaskInternal(t,'Delegated task completed');if((t.status==='open'||t.status==='delegated')&&this.elapsed>t.dueAt)this.applyMissedTask(t);}
    if(this.elapsed%60===0)this.addEvent(`Shift checkpoint ${this.clock()}: reprioritize all assigned patients and open tasks.`,'warn');if(this.elapsed>=this.def.duration)this.finish('time');this.evaluateCompletion();
  }
  hasPendingAdmissions(){return (this.def.events||[]).some(e=>e.kind==='admission'&&this.elapsed<e.at);}
  evaluateCompletion(){if(this.status!=='running')return;const allClinical=this.patientSessions.every(x=>x.status==='complete'||this.patientMeta[x.id]?.disposition==='Discharged');const noOpen=this.tasks.every(t=>['completed','missed'].includes(t.status));if(allClinical&&noOpen&&!this.hasPendingAdmissions()&&this.elapsed>=Math.min(this.def.duration-30,420))this.finish('objectives');}
  finish(reason='manual'){if(this.status==='complete')return;this.status='complete';this.finishReason=reason;for(const p of this.patientSessions)if(p.status!=='complete')p.finish(reason);for(const t of this.tasks)if(t.status==='open'||t.status==='delegated')this.applyMissedTask(t);if(this.score()>=85)this.achievements.push('Shift Commander');if(this.switches>=5)this.achievements.push('Situational Awareness');if(this.operationsScore>=90)this.achievements.push('Operational Excellence');if(this.tasks.filter(t=>t.status==='missed').length===0)this.achievements.push('Nothing Fell Through');this.addEvent('Shift complete — full hospital debrief ready','system');}
  pause(){if(this.status==='running'){this.status='paused';for(const p of this.patientSessions)p.pause();this.addEvent('Shift paused','system');}}
  resume(){if(this.status==='paused'){this.status='running';for(const p of this.patientSessions)p.resume();this.addEvent('Shift resumed','system');}}
  clinicalScore(){return Math.round(this.patientSessions.reduce((n,p)=>n+p.score,0)/Math.max(1,this.patientSessions.length));}
  score(){return Math.round(this.clinicalScore()*.76+this.operationsScore*.24);}
  handoff(){return this.patientSessions.map(p=>({patientId:p.id,name:p.patient.name,room:p.patient.room,diagnosis:p.patient.diagnosis,acuity:p.scenario.acuity,status:this.patientMeta[p.id]?.disposition||'Assigned',vitals:clone(p.patient.vitals),pending:p.scenario.expected.filter(a=>!p.completedActions.includes(a)),notes:p.chart.notes.slice(0,2)}));}
  public(){const open=this.tasks.filter(t=>t.status==='open'||t.status==='delegated');return {id:this.id,kind:'shift',shift:{id:this.def.id,title:this.def.title,level:this.def.level,summary:this.def.summary},learnerName:this.learnerName,role:this.role,difficulty:this.difficulty,elapsed:this.elapsed,clock:this.clock(),status:this.status,score:this.score(),clinicalScore:this.clinicalScore(),operationsScore:this.operationsScore,maxScore:100,activePatientId:this.activePatientId,patients:this.patientSessions.map(p=>({...p.public(),assignment:this.patientMeta[p.id]})),events:this.events,achievements:this.achievements,switches:this.switches,finishReason:this.finishReason||null,tasks:this.tasks,openTaskCount:open.length,overdueCount:this.tasks.filter(t=>t.status==='missed').length,staff:this.staff,interruptions:this.interruptions,handoff:this.handoff()};}
  tick(minutes=1){const count=Math.max(0,Math.floor(Number(minutes)||0));for(let i=0;i<count;i++)this._tickOne();return this.snapshot();}
  performAction(actionId,patientId){return this.action(actionId,patientId);}
  snapshot(){return clone(this.public());}
  serialize(){return clone({schemaVersion:1,id:this.id,kind:'shift',definitionId:this.def.id,definitionVersion:this.def.version||'3.0.0',learnerName:this.learnerName,role:this.role,difficulty:this.difficulty,elapsed:this.elapsed,status:this.status,createdAt:this.createdAt,events:this.events,achievements:this.achievements,switches:this.switches,operationsScore:this.operationsScore,triggeredShiftEvents:this.triggeredShiftEvents,tasks:this.tasks,interruptions:this.interruptions,taskCounter:this.taskCounter,patientMeta:this.patientMeta,staff:this.staff,activePatientId:this.activePatientId,finishReason:this.finishReason||null,patients:this.patientSessions.map(p=>p.serialize())});}
  static restore(state){const definition=getShift(state.definitionId);if(!definition)throw new Error('Unknown shift in saved state');const x=ShiftEngine.create({definition,learnerName:state.learnerName,role:state.role,difficulty:state.difficulty});for(const key of ['id','elapsed','status','createdAt','events','achievements','switches','operationsScore','triggeredShiftEvents','tasks','interruptions','taskCounter','patientMeta','staff','activePatientId','finishReason'])if(state[key]!==undefined)x[key]=clone(state[key]);x.patientSessions=(state.patients||[]).map(p=>SimulationEngine.restore(p));return x;}
}
export function publicShifts(){return SHIFTS.map(({scenarioIds,events,...x})=>({...x,patientCount:scenarioIds.length,mayAddPatients:(events||[]).filter(e=>e.kind==='admission').length,featureCount:(events||[]).length}));}

