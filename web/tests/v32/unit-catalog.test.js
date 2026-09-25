import test from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_CATALOG, getUnitDefinition } from '../../src/living-hospital/unit-catalog.js';
import { validateUnitDefinition } from '../../src/living-hospital/units/unit-contract.js';

test('catalog contains exactly the six approved v3.2 units', () => {
  assert.deepEqual(Object.keys(UNIT_CATALOG).sort(), ['ed','icu','med-surg','ob','pediatrics','telemetry']);
  for (const unit of Object.values(UNIT_CATALOG)) assert.equal(validateUnitDefinition(unit), true);
});

test('Pediatrics and OB carry explicit specialty safety metadata', () => {
  const peds = getUnitDefinition('pediatrics');
  const ob = getUnitDefinition('ob');
  assert.equal(peds.safety.ageAdjustedAssessmentRequired, true);
  assert.equal(peds.safety.weightVerificationRequiredForMedicationConcepts, true);
  assert.equal(ob.safety.specialtyEscalationRequired, true);
  assert.equal(JSON.stringify([peds, ob]).match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|mL)\b/gi), null);
});
