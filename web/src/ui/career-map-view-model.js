import { CAREER_TREES, getCareerNode } from '../living-hospital/career-trees.js';
import { evaluateCareerUnlock } from '../living-hospital/progression-engine.js';

function buildNode(id, context, startingNodes) {
  const node = getCareerNode(id);
  const completed = context.completedNodeIds.includes(id);
  const evaluation = evaluateCareerUnlock({
    nodeId:id,
    completedNodeIds:context.completedNodeIds,
    performance:context.performance,
    competencySummary:context.competencySummary,
    xp:context.xp
  });
  return {
    id:node.id,
    title:node.title,
    unitId:node.unitId ?? null,
    track:node.track,
    starting:startingNodes.includes(id),
    state:completed ? 'completed' : (evaluation.unlocked ? 'unlocked' : 'locked'),
    blockers:[...evaluation.blockers],
    requirements:evaluation.requirements
  };
}

export function buildCareerMapModel({ completedNodeIds = [], performance = {}, competencySummary = {}, xp = 0 } = {}) {
  const context = {completedNodeIds:[...completedNodeIds],performance,competencySummary,xp};
  return {
    specialty:CAREER_TREES.specialty.nodeIds.map(id => buildNode(id,context,CAREER_TREES.specialty.startingNodes)),
    leadership:CAREER_TREES.leadership.nodeIds.map(id => buildNode(id,context,CAREER_TREES.leadership.startingNodes))
  };
}
