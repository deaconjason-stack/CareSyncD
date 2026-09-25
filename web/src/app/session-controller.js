import { getScenario } from '../data/scenarios.js';
import { getShift } from '../data/shifts.js';
import { SimulationEngine } from '../engine/simulation-engine.js';
import { ShiftEngine } from '../engine/shift-engine.js';
import { createSimulationRun } from '../domain/schema.js';

export class SessionController {
  constructor({persistence}){this.persistence=persistence;this.engine=null;this.record=null;}
  async open(){await this.persistence.open();return this;}
  async startScenario({scenarioId,learnerName='Learner',difficulty='standard',role='student'}){const def=getScenario(scenarioId);if(!def)throw new Error('Unknown scenario');this.engine=SimulationEngine.create({definition:def,learnerName,difficulty,role});this.record=createSimulationRun({runId:this.engine.id,kind:'scenario',definitionId:def.id,definitionVersion:def.version,difficulty,startTime:this.engine.createdAt,state:this.engine.serialize()});await this._save();return this.engine.snapshot();}
  async startShift({shiftId,learnerName='Learner',difficulty='standard',role='student'}){const def=getShift(shiftId);if(!def)throw new Error('Unknown shift');this.engine=ShiftEngine.create({definition:def,learnerName,difficulty,role});this.record=createSimulationRun({runId:this.engine.id,kind:'shift',definitionId:def.id,definitionVersion:def.version,difficulty,startTime:this.engine.createdAt,state:this.engine.serialize()});await this._save();return this.engine.snapshot();}
  async resumeActive(){const record=await this.persistence.getActiveRun();if(!record)return null;this.record=record;this.engine=record.kind==='shift'?ShiftEngine.restore(record.state):SimulationEngine.restore(record.state);return this.engine.snapshot();}
  async tick(minutes=1){this._need();this.engine.tick(minutes);await this._save();return this.engine.snapshot();}
  async action(actionId,patientId){this._need();const r=this.record.kind==='shift'?this.engine.performAction(actionId,patientId):this.engine.performAction(actionId);await this._save();return {result:r,state:this.engine.snapshot()};}
  async task(taskId,command,staffId){this._need();if(this.record.kind!=='shift')throw new Error('Tasks require a shift');const r=this.engine.taskCommand(taskId,command,staffId);await this._save();return {result:r,state:this.engine.snapshot()};}
  async selectPatient(patientId){this._need();if(this.record.kind!=='shift')throw new Error('Patient selection requires a shift');if(!this.engine.selectPatient(patientId))throw new Error('Patient not found');await this._save();return this.engine.snapshot();}
  async note(text,patientId){this._need();const ok=this.record.kind==='shift'?this.engine.addNote(patientId,text):this.engine.addNote(text);await this._save();return ok;}
  async hint(patientId){this._need();const r=this.record.kind==='shift'?this.engine.hint(patientId):this.engine.requestHint();await this._save();return r;}
  async pause(){this._need();this.engine.pause();await this._save();return this.engine.snapshot();}
  async resume(){this._need();this.engine.resume();await this._save();return this.engine.snapshot();}
  async finishActive(reason='manual'){this._need();this.engine.finish(reason);this.record.status='complete';this.record.endTime=new Date().toISOString();this.record.state=this.engine.serialize();this.record.final=this.engine.snapshot();await this.persistence.putRun(this.record);await this.persistence.clearActiveRun();return this.record.final;}
  snapshot(){return this.engine?.snapshot()||null}
  async _save(){this.record.state=this.engine.serialize();if(this.engine.status==='complete'){this.record.status='complete';this.record.endTime=this.record.endTime||new Date().toISOString();this.record.final=this.engine.snapshot();await this.persistence.putRun(this.record);await this.persistence.clearActiveRun();}else{await this.persistence.putActiveRun(this.record)}}
  _need(){if(!this.engine||!this.record)throw new Error('No active simulation')}
}
