import { getUnitDefinition } from '../living-hospital/unit-catalog.js';

const ORG_ROLES = new Set(['organization_admin','instructor','learner']);
const DIFFICULTIES = new Set(['guided','standard','challenge']);
const COMPETENCIES = new Set(['clinicalJudgment','operations','communication','leadership']);

function requiredString(value,field){
  if(typeof value!=='string'||!value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function clone(value){
  return structuredClone(value);
}

function validDate(value,field,{optional=false}={}){
  if(optional&&value==null) return null;
  const ms=new Date(value).getTime();
  if(!value||Number.isNaN(ms)) throw new TypeError(`${field} must be a valid date`);
  return new Date(ms).toISOString();
}

function assertOrg(state){
  if(!state||typeof state!=='object'||!state.id||!state.members||!state.cohorts||!state.assignments){
    throw new TypeError('organization state is required');
  }
}

export function createOrganization({id,name,seatLimit}={}){
  id=requiredString(id,'id');
  name=requiredString(name,'name');
  if(!Number.isInteger(seatLimit)||seatLimit<1) throw new TypeError('seatLimit must be a positive integer');
  return {id,name,seatLimit,members:{},cohorts:{},assignments:{}};
}

export function addOrganizationMember(state,{accountId,role}={}){
  assertOrg(state);
  accountId=requiredString(accountId,'accountId');
  role=requiredString(role,'role');
  if(!ORG_ROLES.has(role)) throw new RangeError(`Unknown organization role: ${role}`);
  const current=state.members[accountId];
  if(current){
    if(current.role===role) return clone(state);
    throw new Error(`${accountId} is already a member with role ${current.role}`);
  }
  if(role==='learner'){
    const used=Object.values(state.members).filter(member=>member.role==='learner').length;
    if(used>=state.seatLimit) throw new Error('Organization learner seat limit reached');
  }
  const next=clone(state);
  next.members[accountId]={accountId,role};
  return next;
}

export function removeOrganizationMember(state,accountId){
  assertOrg(state);
  accountId=requiredString(accountId,'accountId');
  const next=clone(state);
  delete next.members[accountId];
  for(const cohort of Object.values(next.cohorts)){
    cohort.instructorIds=(cohort.instructorIds??[]).filter(id=>id!==accountId);
    cohort.learnerIds=(cohort.learnerIds??[]).filter(id=>id!==accountId);
  }
  return next;
}

export function createCohort(state,{id,name,instructorIds=[]}={}){
  assertOrg(state);
  id=requiredString(id,'id');
  name=requiredString(name,'name');
  if(state.cohorts[id]) throw new Error(`Cohort already exists: ${id}`);
  const instructors=[...new Set(instructorIds.map(value=>requiredString(value,'instructorId')))];
  for(const instructorId of instructors){
    if(state.members[instructorId]?.role!=='instructor') throw new Error(`${instructorId} is not an organization instructor`);
  }
  const next=clone(state);
  next.cohorts[id]={id,name,instructorIds:instructors,learnerIds:[]};
  return next;
}

export function enrollLearner(state,{cohortId,learnerId}={}){
  assertOrg(state);
  cohortId=requiredString(cohortId,'cohortId');
  learnerId=requiredString(learnerId,'learnerId');
  const cohort=state.cohorts[cohortId];
  if(!cohort) throw new Error(`Unknown cohort: ${cohortId}`);
  if(state.members[learnerId]?.role!=='learner') throw new Error(`${learnerId} is not an organization learner`);
  if(cohort.learnerIds.includes(learnerId)) return clone(state);
  const next=clone(state);
  next.cohorts[cohortId].learnerIds.push(learnerId);
  next.cohorts[cohortId].learnerIds.sort();
  return next;
}

function normalizeCompetencies(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new TypeError('requiredCompetencies must be an object');
  const out={};
  for(const [domain,score] of Object.entries(input)){
    if(!COMPETENCIES.has(domain)) throw new RangeError(`Unknown competency: ${domain}`);
    if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100) throw new RangeError(`Invalid competency threshold: ${domain}`);
    out[domain]=score;
  }
  return out;
}

export function createAssignment(state,input={}){
  assertOrg(state);
  const id=requiredString(input.id,'id');
  const cohortId=requiredString(input.cohortId,'cohortId');
  const title=requiredString(input.title,'title');
  const unitId=requiredString(input.unitId,'unitId');
  const difficulty=requiredString(input.difficulty,'difficulty');
  if(state.assignments[id]) throw new Error(`Assignment already exists: ${id}`);
  if(!state.cohorts[cohortId]) throw new Error(`Unknown cohort: ${cohortId}`);
  if(!getUnitDefinition(unitId)) throw new RangeError(`Unknown unit: ${unitId}`);
  if(!DIFFICULTIES.has(difficulty)) throw new RangeError(`Unknown difficulty: ${difficulty}`);
  const dueAt=validDate(input.dueAt,'dueAt');
  const availableFrom=validDate(input.availableFrom,'availableFrom',{optional:true});
  const availableUntil=validDate(input.availableUntil,'availableUntil',{optional:true});
  if(availableFrom&&availableUntil&&new Date(availableFrom)>new Date(availableUntil)) throw new RangeError('availability window is invalid');
  const minimumCompletedShifts=input.minimumCompletedShifts??0;
  if(!Number.isInteger(minimumCompletedShifts)||minimumCompletedShifts<0) throw new RangeError('minimumCompletedShifts must be a non-negative integer');
  const next=clone(state);
  next.assignments[id]={
    id,cohortId,title,unitId,difficulty,dueAt,availableFrom,availableUntil,
    requiredCompetencies:normalizeCompetencies(input.requiredCompetencies??{}),
    minimumCompletedShifts
  };
  return next;
}

export function visibleLearnerIdsForInstructor(state,instructorId){
  assertOrg(state);
  instructorId=requiredString(instructorId,'instructorId');
  const visible=new Set();
  for(const cohort of Object.values(state.cohorts)){
    if((cohort.instructorIds??[]).includes(instructorId)){
      for(const learnerId of cohort.learnerIds??[]) visible.add(learnerId);
    }
  }
  return [...visible].sort();
}
