export function createScopePolicy(profile = {}) {
  const perform = new Set(profile.perform ?? []);
  const delegate = profile.delegate ?? {};
  return Object.freeze({
    canPerform(actionId) {
      return perform.has(actionId);
    },
    canDelegate(actionId, targetRole) {
      return Array.isArray(delegate[actionId]) && delegate[actionId].includes(targetRole);
    }
  });
}
