const nodes = [
  { id:'specialty-med-surg', track:'specialty', title:'Med-Surg Start', unitId:'med-surg', prerequisites:[], minPerformance:0, competencyMinimums:{} },
  { id:'specialty-ed', track:'specialty', title:'ED Start', unitId:'ed', prerequisites:[], minPerformance:0, competencyMinimums:{} },
  { id:'specialty-telemetry', track:'specialty', title:'Telemetry / Step-Down Start', unitId:'telemetry', prerequisites:[], minPerformance:0, competencyMinimums:{} },
  { id:'specialty-icu', track:'specialty', title:'ICU Start', unitId:'icu', prerequisites:[], minPerformance:0, competencyMinimums:{} },
  { id:'specialty-pediatrics', track:'specialty', title:'Pediatrics Start', unitId:'pediatrics', prerequisites:[], minPerformance:0, competencyMinimums:{} },
  { id:'specialty-ob', track:'specialty', title:'OB Start', unitId:'ob', prerequisites:[], minPerformance:0, competencyMinimums:{} },

  { id:'cross-med-surg-telemetry', track:'specialty', title:'Med-Surg to Telemetry Cross-Training', unitId:'telemetry', prerequisites:['specialty-med-surg'], minPerformance:75, competencyMinimums:{ clinicalJudgment:70, operations:65, communication:65 } },
  { id:'cross-ed-critical-care', track:'specialty', title:'ED High-Acuity / Critical Care Cross-Training', unitId:'icu', prerequisites:['specialty-ed'], minPerformance:80, competencyMinimums:{ clinicalJudgment:80, operations:75, communication:70 } },
  { id:'advanced-telemetry', track:'specialty', title:'Advanced Telemetry / Step-Down', unitId:'telemetry', prerequisites:['specialty-telemetry'], minPerformance:80, competencyMinimums:{ clinicalJudgment:80, operations:75, communication:70 } },
  { id:'advanced-icu', track:'specialty', title:'Advanced Critical Care', unitId:'icu', prerequisites:['specialty-icu'], minPerformance:85, competencyMinimums:{ clinicalJudgment:85, operations:80, communication:75 } },
  { id:'advanced-pediatrics', track:'specialty', title:'Advanced Pediatrics', unitId:'pediatrics', prerequisites:['specialty-pediatrics'], minPerformance:80, competencyMinimums:{ clinicalJudgment:80, communication:80, operations:70 } },
  { id:'advanced-ob', track:'specialty', title:'Advanced Obstetrics', unitId:'ob', prerequisites:['specialty-ob'], minPerformance:80, competencyMinimums:{ clinicalJudgment:80, communication:80, operations:70 } },

  { id:'leadership-bedside', track:'leadership', title:'Bedside Nurse', prerequisites:[], minPerformance:0, competencyMinimums:{} },
  { id:'leadership-lead', track:'leadership', title:'Senior / Lead Nurse', prerequisites:['leadership-bedside'], minPerformance:75, competencyMinimums:{ clinicalJudgment:75, operations:70, communication:70, leadership:55 } },
  { id:'leadership-charge', track:'leadership', title:'Charge Nurse', prerequisites:['leadership-lead'], minPerformance:80, competencyMinimums:{ clinicalJudgment:75, operations:80, communication:75, leadership:70 } },
  { id:'leadership-house-supervisor', track:'leadership', title:'House Supervisor', prerequisites:['leadership-charge'], minPerformance:85, competencyMinimums:{ clinicalJudgment:75, operations:85, communication:80, leadership:80 } },
  { id:'leadership-clinical-leader', track:'leadership', title:'Clinical Leader', prerequisites:['leadership-house-supervisor'], minPerformance:90, competencyMinimums:{ clinicalJudgment:80, operations:90, communication:85, leadership:90 } }
].map(node => Object.freeze({ ...node, prerequisites:Object.freeze([...node.prerequisites]), competencyMinimums:Object.freeze({...node.competencyMinimums}) }));

const byId = Object.freeze(Object.fromEntries(nodes.map(node => [node.id, node])));

export const CAREER_TREES = Object.freeze({
  specialty:Object.freeze({
    startingNodes:Object.freeze(['specialty-ed','specialty-icu','specialty-med-surg','specialty-ob','specialty-pediatrics','specialty-telemetry']),
    nodeIds:Object.freeze(nodes.filter(n => n.track === 'specialty').map(n => n.id))
  }),
  leadership:Object.freeze({
    startingNodes:Object.freeze(['leadership-bedside']),
    nodeIds:Object.freeze(['leadership-bedside','leadership-lead','leadership-charge','leadership-house-supervisor','leadership-clinical-leader'])
  })
});

export function getCareerNode(id) {
  return byId[id] ?? null;
}

export function listCareerNodes() {
  return [...nodes];
}
