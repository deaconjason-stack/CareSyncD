const REQUIRED_ARRAYS = ['learningFocus', 'staffingRoles', 'caseTemplates'];

export function validateUnitDefinition(unit) {
  if (!unit || typeof unit !== 'object') return false;
  for (const key of ['id','title','population','environment']) {
    if (typeof unit[key] !== 'string' || !unit[key].trim()) return false;
  }
  if (!REQUIRED_ARRAYS.every(key => Array.isArray(unit[key]))) return false;
  if (!unit.safety || unit.safety.educationalOnly !== true || unit.safety.specialtyEscalationRequired !== true) return false;
  return unit.caseTemplates.every(template =>
    template &&
    typeof template.id === 'string' &&
    typeof template.title === 'string' &&
    typeof template.scenarioId === 'string' &&
    Array.isArray(template.learningObjectives) &&
    Array.isArray(template.expectedActionIds)
  );
}
