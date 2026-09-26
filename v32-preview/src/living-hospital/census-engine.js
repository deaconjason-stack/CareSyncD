import { transferBlockers } from './transfer-engine.js';

function cloneUnits(units = {}) {
  return Object.fromEntries(Object.entries(units).map(([id, unit]) => [id, { ...unit }]));
}

function admissionBlockers(units, request) {
  const unit = units[request.toUnit];
  if (!unit) throw new RangeError(`Unknown destination unit: ${request.toUnit}`);
  const blockers = [];
  if ((unit.openBeds ?? 0) <= 0) blockers.push('bed');
  if (!unit.staffReady) blockers.push('staffing');
  if (!request.handoffReady) blockers.push('handoff');
  if (!request.transportReady) blockers.push('transport');
  return blockers;
}

export function requestAdmission(state, { patient, toUnit, handoffReady = false, transportReady = false }) {
  if (!patient?.id) throw new TypeError('patient.id is required');
  const request = {
    patientId: patient.id,
    patient: { ...patient },
    toUnit,
    handoffReady: Boolean(handoffReady),
    transportReady: Boolean(transportReady)
  };
  const blockers = admissionBlockers(state.units ?? {}, request);
  return {
    ...state,
    admissions: {
      ...(state.admissions ?? {}),
      [patient.id]: {
        ...request,
        status: blockers.length ? 'waiting' : 'ready',
        blockers,
        requestedMinute: state.clock.minute
      }
    },
    timeline: [
      ...state.timeline,
      { kind: 'ADMISSION_REQUESTED', patientId: patient.id, toUnit, blockers: [...blockers], minute: state.clock.minute }
    ]
  };
}

export function markDischargeReady(state, { patientId }) {
  const patient = state.patients?.[patientId];
  if (!patient) throw new RangeError(`Unknown patient: ${patientId}`);
  return {
    ...state,
    patients: {
      ...state.patients,
      [patientId]: {
        ...patient,
        discharge: { ...(patient.discharge ?? {}), status: 'ready', readyMinute: state.clock.minute }
      }
    },
    timeline: [...state.timeline, { kind: 'DISCHARGE_READY', patientId, minute: state.clock.minute }]
  };
}

export function advanceBedFlow(state) {
  const units = cloneUnits(state.units);
  const patients = Object.fromEntries(Object.entries(state.patients ?? {}).map(([id, patient]) => [id, { ...patient }]));
  const transfers = Object.fromEntries(Object.entries(state.transfers ?? {}).map(([id, transfer]) => [id, { ...transfer, blockers: [...(transfer.blockers ?? [])] }]));
  const admissions = Object.fromEntries(Object.entries(state.admissions ?? {}).map(([id, admission]) => [id, { ...admission, patient: { ...admission.patient }, blockers: [...(admission.blockers ?? [])] }]));
  const timeline = [...state.timeline];

  for (const patientId of Object.keys(patients).sort()) {
    const patient = patients[patientId];
    if (patient.discharge?.status !== 'ready') continue;
    const fromUnit = patient.unitId;
    if (fromUnit && units[fromUnit]) {
      units[fromUnit] = { ...units[fromUnit], openBeds: (units[fromUnit].openBeds ?? 0) + 1 };
    }
    patients[patientId] = {
      ...patient,
      unitId: null,
      status: 'discharged',
      discharge: { ...patient.discharge, status: 'complete', completedMinute: state.clock.minute }
    };
    timeline.push({ kind: 'DISCHARGE_COMPLETED', patientId, fromUnit, minute: state.clock.minute });
  }

  for (const patientId of Object.keys(transfers).sort()) {
    const transfer = transfers[patientId];
    if (transfer.status === 'complete') continue;
    const snapshot = { ...state, units };
    const blockers = transferBlockers(snapshot, transfer);
    if (blockers.length) {
      transfers[patientId] = { ...transfer, status: 'waiting', blockers };
      continue;
    }

    const patient = patients[patientId];
    if (!patient || patient.status === 'discharged') continue;
    const fromUnit = patient.unitId;
    if (fromUnit && units[fromUnit]) {
      units[fromUnit] = { ...units[fromUnit], openBeds: (units[fromUnit].openBeds ?? 0) + 1 };
    }
    units[transfer.toUnit] = { ...units[transfer.toUnit], openBeds: units[transfer.toUnit].openBeds - 1 };
    patients[patientId] = { ...patient, unitId: transfer.toUnit };
    transfers[patientId] = { ...transfer, status: 'complete', blockers: [], completedMinute: state.clock.minute };
    timeline.push({ kind: 'TRANSFER_COMPLETED', patientId, fromUnit, toUnit: transfer.toUnit, minute: state.clock.minute });
  }

  for (const patientId of Object.keys(admissions).sort()) {
    const admission = admissions[patientId];
    if (admission.status === 'complete') continue;
    const blockers = admissionBlockers(units, admission);
    if (blockers.length) {
      admissions[patientId] = { ...admission, status: 'waiting', blockers };
      continue;
    }
    units[admission.toUnit] = { ...units[admission.toUnit], openBeds: units[admission.toUnit].openBeds - 1 };
    patients[patientId] = { ...admission.patient, unitId: admission.toUnit, status: 'active' };
    admissions[patientId] = { ...admission, status: 'complete', blockers: [], completedMinute: state.clock.minute };
    timeline.push({ kind: 'ADMISSION_COMPLETED', patientId, toUnit: admission.toUnit, minute: state.clock.minute });
  }

  return { ...state, units, patients, transfers, admissions, timeline };
}
