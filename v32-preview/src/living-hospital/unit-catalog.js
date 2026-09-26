import { MED_SURG_UNIT } from './units/med-surg.js';
import { EMERGENCY_UNIT } from './units/emergency.js';
import { TELEMETRY_UNIT } from './units/telemetry.js';
import { ICU_UNIT } from './units/icu.js';
import { PEDIATRICS_UNIT } from './units/pediatrics.js';
import { OB_UNIT } from './units/ob.js';
import { validateUnitDefinition } from './units/unit-contract.js';

const units = [MED_SURG_UNIT, EMERGENCY_UNIT, TELEMETRY_UNIT, ICU_UNIT, PEDIATRICS_UNIT, OB_UNIT];
for (const unit of units) {
  if (!validateUnitDefinition(unit)) throw new Error(`Invalid unit definition: ${unit?.id ?? 'unknown'}`);
}

export const UNIT_CATALOG = Object.freeze(Object.fromEntries(units.map(unit => [unit.id, unit])));

export function getUnitDefinition(id) {
  return UNIT_CATALOG[id] ?? null;
}

export function listUnitDefinitions() {
  return Object.values(UNIT_CATALOG);
}
