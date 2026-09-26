import { createHospitalWorld } from '../living-hospital/hospital-world.js';
import { createSeededRng } from '../living-hospital/seeded-rng.js';
import { scheduleEvent } from '../living-hospital/event-engine.js';
import { requestTransfer } from '../living-hospital/transfer-engine.js';
import { markDischargeReady } from '../living-hospital/census-engine.js';
import { delegateTask } from '../living-hospital/delegation-engine.js';
import { createCompetencyLedger, recordCompetencyEvidence } from '../living-hospital/competency-engine.js';
import { buildDebrief } from '../living-hospital/debrief-engine.js';

const clone=value=>structuredClone(value);

export function createV32LivingHospitalSession({state,seed=state?.seed,competencyLedger=null}={}){
  if(!state||typeof state!=='object') throw new TypeError('state is required');
  if(!Number.isInteger(seed)) throw new TypeError('seed must be an integer');

  let current=clone(state);
  let ledger=clone(competencyLedger??createCompetencyLedger());
  const rng=createSeededRng(seed);

  return {
    snapshot(){
      return clone(current);
    },

    scheduleEvent(event){
      const result=scheduleEvent(current,event);
      current=result.state;
      return {accepted:result.accepted,reason:result.reason,state:clone(current)};
    },

    requestTransfer(input){
      current=requestTransfer(current,input);
      return clone(current);
    },

    markDischargeReady(input){
      current=markDischargeReady(current,input);
      return clone(current);
    },

    delegateTask(input){
      current=delegateTask(current,input);
      return clone(current);
    },

    recordCompetencyEvidence(evidence){
      ledger=recordCompetencyEvidence(ledger,evidence);
      return clone(ledger);
    },

    tick(actions=[]){
      const world=createHospitalWorld.withDefaultEngines({state:current,rng});
      current=world.tick(actions);
      return clone(current);
    },

    buildDebrief(summary={}){
      return clone(buildDebrief({timeline:current.timeline,competencyLedger:ledger,shiftSummary:clone(summary)}));
    }
  };
}
