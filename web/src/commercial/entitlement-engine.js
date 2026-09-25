const MAX_OFFLINE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

function parseTime(value, field) {
  const time = new Date(value).getTime();
  if (!value || Number.isNaN(time)) throw new TypeError(`${field} must be a valid date`);
  return time;
}

function normalizedFeatures(features) {
  if (!Array.isArray(features)) throw new TypeError('features must be an array');
  return Object.freeze([...new Set(features.map(String))].sort());
}

export function createEntitlementSnapshot({id,accountId,planId,features=[],verifiedByServer,issuedAt,expiresAt}={}) {
  if (verifiedByServer !== true) throw new Error('Entitlement snapshot must be server verified');
  if (!id || !accountId || !planId) throw new TypeError('id, accountId, and planId are required');
  const issued = parseTime(issuedAt,'issuedAt');
  const expires = parseTime(expiresAt,'expiresAt');
  if (expires <= issued) throw new RangeError('expiresAt must be after issuedAt');
  return Object.freeze({
    id:String(id), accountId:String(accountId), planId:String(planId),
    features:normalizedFeatures(features), verifiedByServer:true,
    issuedAt:new Date(issued).toISOString(), expiresAt:new Date(expires).toISOString()
  });
}

export function evaluateEntitlement(snapshot,{now,offline=false,startingNewShift=true,activeShiftStartedAt=null}={}) {
  if (!snapshot || snapshot.verifiedByServer !== true) return {access:'demo',features:[],reason:'unverified'};
  let nowMs;
  let issuedMs;
  let expiresMs;
  try {
    nowMs=parseTime(now,'now');
    issuedMs=parseTime(snapshot.issuedAt,'issuedAt');
    expiresMs=parseTime(snapshot.expiresAt,'expiresAt');
  } catch {
    return {access:'demo',features:[],reason:'invalid-snapshot'};
  }
  const features=[...new Set((snapshot.features??[]).map(String))].sort();

  const activeStartedMs = activeShiftStartedAt ? new Date(activeShiftStartedAt).getTime() : NaN;
  const mayFinishExisting = !startingNewShift && Number.isFinite(activeStartedMs) && activeStartedMs <= expiresMs;

  if (nowMs > expiresMs) {
    if (mayFinishExisting) return {access:'finish-active-only',features,reason:'entitlement-expired'};
    return {access:'demo',features:[],reason:'entitlement-expired'};
  }

  if (offline && nowMs - issuedMs > MAX_OFFLINE_CACHE_MS) {
    if (mayFinishExisting) return {access:'finish-active-only',features,reason:'offline-cache-expired'};
    return {access:'demo',features:[],reason:'offline-cache-expired'};
  }

  return {access:'premium',features,reason:null};
}

export { MAX_OFFLINE_CACHE_MS };
