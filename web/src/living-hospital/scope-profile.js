import { createScopePolicy } from './scope-policy.js';

function cloneRole(role = {}) {
  const perform = [...(role.perform ?? [])];
  const delegate = Object.fromEntries(
    Object.entries(role.delegate ?? {}).map(([actionId, roles]) => [actionId, [...roles]])
  );
  return Object.freeze({ perform: Object.freeze(perform), delegate: Object.freeze(delegate) });
}

export function createScopeProfile(config) {
  if (!config || !config.id || !config.jurisdiction || !config.facility || !config.roles || typeof config.roles !== 'object') {
    throw new Error('Scope profile requires id, jurisdiction, facility, and roles');
  }
  const roles = Object.fromEntries(
    Object.entries(config.roles).map(([roleId, role]) => [roleId, cloneRole(role)])
  );
  return Object.freeze({
    id: String(config.id),
    jurisdiction: String(config.jurisdiction),
    facility: String(config.facility),
    roles: Object.freeze(roles)
  });
}

export function policyForRole(profile, roleId) {
  const role = profile?.roles?.[roleId];
  if (!role) throw new Error(`Unknown role: ${roleId}`);
  return createScopePolicy({ perform: role.perform, delegate: role.delegate });
}
