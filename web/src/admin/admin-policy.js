import { classifyPricingChange } from '../commercial/pricing-catalog.js';

export const ADMIN_ACTIONS = Object.freeze([
  'manage_subscriber',
  'manage_instructor',
  'manage_organization',
  'manage_reports',
  'manage_content',
  'manage_promotion',
  'propose_pricing_change',
  'transfer_ownership',
  'remove_founder',
  'demote_founder',
  'replace_founder',
  'manage_payment_ownership',
  'manage_security_ownership'
]);

const ACTION_SET = new Set(ADMIN_ACTIONS);
const FOUNDER_PROTECTED = new Set([
  'transfer_ownership','remove_founder','demote_founder','replace_founder',
  'manage_payment_ownership','manage_security_ownership'
]);

function result(allowed, requiresFounderApproval=false, reasons=[]) {
  return {allowed:Boolean(allowed),requiresFounderApproval:Boolean(requiresFounderApproval),reasons:[...reasons]};
}

export function evaluateAdminAction({actorRole,action,targetRole=null,previousPrice=null,nextPrice=null}={}) {
  if (!ACTION_SET.has(action)) throw new RangeError(`Unknown admin action: ${action}`);
  if (actorRole === 'founder') return result(true,false,[]);
  if (actorRole !== 'admin') return result(false,false,['insufficient-role']);

  if (FOUNDER_PROTECTED.has(action) || (targetRole === 'founder' && ['remove_founder','demote_founder','replace_founder'].includes(action))) {
    return result(false,false,['founder-protected']);
  }

  if (action === 'propose_pricing_change') {
    if (!previousPrice || !nextPrice) throw new TypeError('previousPrice and nextPrice are required for pricing changes');
    const classification=classifyPricingChange(previousPrice,nextPrice);
    return result(true,classification.major,classification.reasons);
  }

  return result(true,false,[]);
}
