import { scheduleEvent } from '../living-hospital/event-engine.js';

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function clone(value) {
  return structuredClone(value);
}

function assertSession(session) {
  if (!session || typeof session !== 'object' || !session.id || !session.instructorId || !session.learnerId) {
    throw new TypeError('observation session is required');
  }
}

function requireObservation(session) {
  assertSession(session);
  if (!session.observationEnabled) throw new Error('Instructor observation is disabled for this session');
}

function normalizeMinute(value, field='minute') {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${field} must be a non-negative finite number`);
  return value;
}

export function createObservationSession({
  id,
  instructorId,
  learnerId,
  assignmentId,
  observationEnabled=false,
  labMode=false
}={}) {
  id=requiredString(id,'id');
  instructorId=requiredString(instructorId,'instructorId');
  learnerId=requiredString(learnerId,'learnerId');
  assignmentId=requiredString(assignmentId,'assignmentId');
  observationEnabled=Boolean(observationEnabled);
  labMode=Boolean(labMode);
  return {
    id,
    instructorId,
    learnerId,
    assignmentId,
    observationEnabled,
    labMode,
    connectionStatus:observationEnabled?'connected':'inactive',
    learnerDisclosure:observationEnabled
      ? {observationActive:true,label:'Instructor Observation Active'}
      : {observationActive:false},
    frames:[],
    notes:[]
  };
}

export function setInstructorConnection(session,status) {
  requireObservation(session);
  if (!['connected','disconnected'].includes(status)) throw new RangeError(`Unknown instructor connection status: ${status}`);
  const next=clone(session);
  next.connectionStatus=status;
  return next;
}

export function appendObservationFrame(session,frame={}) {
  requireObservation(session);
  if (!Number.isInteger(frame.sequence) || frame.sequence < 1) throw new TypeError('frame sequence must be a positive integer');
  const last=session.frames?.at(-1)?.sequence ?? 0;
  if (frame.sequence <= last) throw new Error('frame sequence must be strictly increasing');
  const next=clone(session);
  next.frames.push({
    sequence:frame.sequence,
    minute:normalizeMinute(frame.minute),
    type:requiredString(frame.type,'frame type'),
    payload:clone(frame.payload ?? {})
  });
  return next;
}

export function framesAfter(session,sequence) {
  requireObservation(session);
  if (!Number.isInteger(sequence) || sequence < 0) throw new TypeError('sequence must be a non-negative integer');
  return (session.frames ?? [])
    .filter(frame=>frame.sequence>sequence)
    .map(frame=>clone(frame));
}

export function addInstructorNote(session,{minute,text}={}) {
  requireObservation(session);
  const next=clone(session);
  next.notes.push({
    minute:normalizeMinute(minute),
    text:requiredString(text,'instructor note'),
    private:true
  });
  return next;
}

export function injectLabEvent(world,session,event) {
  requireObservation(session);
  if (!session.labMode) throw new Error('Simulation Lab mode is not enabled for this session');
  const scheduled=scheduleEvent(world,event);
  if (!scheduled.accepted) {
    return {accepted:false,reason:scheduled.reason,world:scheduled.state,session:clone(session)};
  }
  const audit={
    kind:'INSTRUCTOR_LAB_INJECTION',
    sessionId:session.id,
    instructorId:session.instructorId,
    eventId:event.id,
    minute:scheduled.state.clock.minute
  };
  return {
    accepted:true,
    reason:null,
    world:{...scheduled.state,timeline:[...scheduled.state.timeline,audit]},
    session:clone(session)
  };
}
