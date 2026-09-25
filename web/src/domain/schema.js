export const SCHEMA_VERSION = 1;
const clone = value => structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
export function createLearnerProfile({ learnerId, displayName = 'Learner', xp = 0, rank = 'Clinical Explorer', achievements = [], preferences = {}, competencyHistory = [] } = {}) {
  if (!learnerId) throw new Error('learnerId is required');
  const now = new Date().toISOString();
  return { schemaVersion: SCHEMA_VERSION, learnerId, displayName: String(displayName).slice(0,80), xp, rank, achievements:[...achievements], preferences:clone(preferences), competencyHistory:clone(competencyHistory), createdAt:now, updatedAt:now };
}
export function createSimulationRun({ runId, kind, definitionId, definitionVersion, difficulty='standard', startTime=new Date().toISOString(), state=null } = {}) {
  const record = { schemaVersion: SCHEMA_VERSION, runId, kind, definitionId, definitionVersion, difficulty, startTime, endTime:null, status:'active', state };
  assertSimulationRun(record); return record;
}
export function assertSimulationRun(record) {
  if (!record || record.schemaVersion !== SCHEMA_VERSION) throw new Error('schemaVersion is unsupported');
  if (!record.runId) throw new Error('runId is required');
  if (!['scenario','shift'].includes(record.kind)) throw new Error('kind must be scenario or shift');
  if (!record.definitionId) throw new Error('definitionId is required');
  if (!record.definitionVersion) throw new Error('definitionVersion is required');
  if (!['active','complete','abandoned'].includes(record.status)) throw new Error('status is invalid');
  return record;
}
