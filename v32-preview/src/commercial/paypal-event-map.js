const TYPE_MAP = Object.freeze({
  'BILLING.SUBSCRIPTION.ACTIVATED':'subscription_activated',
  'BILLING.SUBSCRIPTION.CANCELLED':'subscription_canceled',
  'BILLING.SUBSCRIPTION.SUSPENDED':'payment_failed',
  'BILLING.SUBSCRIPTION.EXPIRED':'subscription_expired',
  'PAYMENT.SALE.DENIED':'payment_failed',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED':'payment_failed'
});

export function mapPayPalWebhook(payload, verification) {
  if (!verification || verification.verificationStatus !== 'SUCCESS') {
    throw new Error('PayPal webhook verification was not successful');
  }
  if (!payload || typeof payload !== 'object') throw new TypeError('PayPal webhook payload is required');
  if (typeof payload.id !== 'string' || !payload.id) throw new TypeError('PayPal webhook id is required');
  if (typeof payload.event_type !== 'string' || !payload.event_type) throw new TypeError('PayPal event_type is required');
  if (typeof payload.create_time !== 'string' || Number.isNaN(new Date(payload.create_time).getTime())) {
    throw new TypeError('PayPal create_time must be valid');
  }

  const type = TYPE_MAP[payload.event_type];
  if (!type) throw new Error(`Unsupported PayPal webhook event: ${payload.event_type}`);
  const providerSubscriptionId = payload.resource?.id ?? payload.resource?.billing_agreement_id ?? null;

  return Object.freeze({
    id:payload.id,
    provider:'paypal',
    type,
    occurredAt:payload.create_time,
    verified:true,
    providerSubscriptionId,
    paidThrough:type === 'subscription_canceled'
      ? (payload.resource?.billing_info?.next_billing_time ?? null)
      : null
  });
}

export { TYPE_MAP as PAYPAL_EVENT_TYPES };
