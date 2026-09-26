import { listUnitDefinitions } from '../living-hospital/unit-catalog.js';
import { buildCareerMapModel } from '../ui/career-map-view-model.js';
import { buildFounderDashboardModel } from '../ui/founder-dashboard-view-model.js';
import { evaluateEntitlement } from '../commercial/entitlement-engine.js';

const clone=value=>value===undefined?undefined:structuredClone(value);

function deepFreeze(value){
  if(!value||typeof value!=='object'||Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function emptyFounderSnapshot(asOf){
  return {
    asOf,
    subscribers:{
      total:0,
      status:{active:0,paymentIssue:0,canceled:0,expired:0},
      new30d:0,
      byPlan:{},
      byCadence:{}
    },
    funnel:{visitor:0,demo:0,account:0,checkout:0,subscriber:0,activeLearner:0,renewal:0},
    acquisition:{},
    learning:{shiftsStarted:0,shiftsCompleted:0,completedByUnit:{}},
    identifiedSubscribers:[]
  };
}

export function buildV32PreviewRuntime({
  now,
  online=true,
  backendConnected=false,
  entitlementSnapshot=null,
  startingNewShift=true,
  activeShiftStartedAt=null,
  career={},
  founderSnapshot=null
}={}){
  const timestamp=new Date(now).toISOString();
  if(!now||timestamp==='Invalid Date') throw new TypeError('now must be a valid date');

  const careerInput={
    completedNodeIds:[...(career.completedNodeIds??[])],
    performance:clone(career.performance??{}),
    competencySummary:clone(career.competencySummary??{}),
    xp:Number(career.xp??0)
  };

  const runtime={
    version:'3.2-preview',
    title:'CareSyncD v3.2 Preview — The Living Hospital',
    asOf:timestamp,
    units:clone(listUnitDefinitions()),
    career:{
      ...careerInput,
      map:buildCareerMapModel(careerInput)
    },
    founder:buildFounderDashboardModel(clone(founderSnapshot??emptyFounderSnapshot(timestamp))),
    capabilities:{
      organizations:true,
      instructorLive:true,
      simulationLab:true
    },
    backend:{
      online:Boolean(online),
      connected:Boolean(backendConnected),
      mode:'local-first',
      simulationAvailable:true
    },
    access:evaluateEntitlement(clone(entitlementSnapshot),{
      now:timestamp,
      offline:!online,
      startingNewShift:Boolean(startingNewShift),
      activeShiftStartedAt:activeShiftStartedAt??null
    }),
    safety:{
      educationalOnly:true,
      acceptsPHI:false,
      clinicalDecisionSupport:false
    }
  };

  return deepFreeze(runtime);
}
