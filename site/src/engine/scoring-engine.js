export const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
export const calculateClinicalScore = session => Math.round(session?.score ?? 0);
export const calculateOperationsScore = shift => Math.round(shift?.operationsScore ?? 0);
export const calculateOverallShiftScore = (clinical, operations) => Math.round(clinical * 0.76 + operations * 0.24);
export function deriveAchievements(summary) {
  const out=[];
  if ((summary.score ?? 0) >= 85) out.push('Shift Commander');
  if ((summary.switches ?? 0) >= 5) out.push('Situational Awareness');
  if ((summary.operationsScore ?? 0) >= 90) out.push('Operational Excellence');
  if ((summary.missedTasks ?? 0) === 0) out.push('Nothing Fell Through');
  return out;
}
