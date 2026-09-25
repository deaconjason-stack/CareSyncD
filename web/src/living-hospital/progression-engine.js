import { getCareerNode } from './career-trees.js';
import { meetsCompetencyRequirements } from './competency-engine.js';

export function evaluateCareerUnlock({ nodeId, completedNodeIds = [], performance = {}, competencySummary = {}, xp = 0 }) {
  const node = getCareerNode(nodeId);
  if (!node) throw new Error(`Unknown career node: ${nodeId}`);

  const completed = new Set(completedNodeIds);
  const blockers = [];

  for (const prerequisite of node.prerequisites) {
    if (!completed.has(prerequisite)) blockers.push(`prerequisite:${prerequisite}`);
  }

  const overall = Number(performance.overall ?? 0);
  if (overall < node.minPerformance) blockers.push('performance:overall');

  const competencyCheck = meetsCompetencyRequirements(competencySummary, node.competencyMinimums);
  for (const domain of competencyCheck.blockers) blockers.push(`competency:${domain}`);

  return {
    nodeId,
    unlocked: blockers.length === 0,
    blockers,
    xp,
    requirements: {
      prerequisites:[...node.prerequisites],
      minPerformance:node.minPerformance,
      competencyMinimums:{...node.competencyMinimums}
    }
  };
}
