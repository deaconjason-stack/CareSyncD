import { createClient } from '@supabase/supabase-js';

const EVENT_MAP: Record<string,string> = {
  'BILLING.SUBSCRIPTION.ACTIVATED':'subscription_activated',
  'BILLING.SUBSCRIPTION.CANCELLED':'subscription_canceled',
  'BILLING.SUBSCRIPTION.SUSPENDED':'payment_failed',
  'BILLING.SUBSCRIPTION.EXPIRED':'subscription_expired',
  'PAYMENT.SALE.DENIED':'payment_failed',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED':'payment_failed'
};

function requiredEnv(name:string):string {
  const value=Deno.env.get(name);
  if(!value) throw new Error(`${name} is required`);
  return value;
}

async function paypalAccessToken(apiBase:string,clientId:string,clientSecret:string):Promise<string> {
  const auth=btoa(`${clientId}:${clientSecret}`);
  const response=await fetch(`${apiBase}/v1/oauth2/token`,{
    method:'POST',
    headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  if(!response.ok) throw new Error(`PayPal OAuth failed: ${response.status}`);
  const data=await response.json();
  if(!data.access_token) throw new Error('PayPal OAuth returned no access token');
  return data.access_token;
}

async function verifyWebhook(req:Request,payload:unknown,token:string,apiBase:string,webhookId:string) {
  const transmissionId=req.headers.get('paypal-transmission-id');
  const transmissionTime=req.headers.get('paypal-transmission-time');
  const certUrl=req.headers.get('paypal-cert-url');
  const authAlgo=req.headers.get('paypal-auth-algo');
  const transmissionSig=req.headers.get('paypal-transmission-sig');
  if(!transmissionId||!transmissionTime||!certUrl||!authAlgo||!transmissionSig) {
    throw new Error('Missing PayPal webhook signature metadata');
  }
  const response=await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      transmission_id:transmissionId,
      transmission_time:transmissionTime,
      cert_url:certUrl,
      auth_algo:authAlgo,
      transmission_sig:transmissionSig,
      webhook_id:webhookId,
      webhook_event:payload
    })
  });
  if(!response.ok) throw new Error(`PayPal verification request failed: ${response.status}`);
  const data=await response.json();
  if(data.verification_status!=='SUCCESS') throw new Error('PayPal webhook verification failed');
}

Deno.serve(async (req:Request) => {
  if(req.method!=='POST') return new Response('Method Not Allowed',{status:405});
  try {
    const apiBase=requiredEnv('PAYPAL_API_BASE');
    const clientId=requiredEnv('PAYPAL_CLIENT_ID');
    const clientSecret=requiredEnv('PAYPAL_CLIENT_SECRET');
    const webhookId=requiredEnv('PAYPAL_WEBHOOK_ID');
    const supabaseUrl=requiredEnv('SUPABASE_URL');
    const serviceKey=requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    const payload=await req.json();
    const eventType=payload?.event_type;
    const normalizedType=EVENT_MAP[eventType];
    if(!normalizedType) return new Response('Ignored',{status:202});

    const token=await paypalAccessToken(apiBase,clientId,clientSecret);
    await verifyWebhook(req,payload,token,apiBase,webhookId);

    const providerEventId=payload?.id;
    const occurredAt=payload?.create_time;
    if(!providerEventId||!occurredAt) throw new Error('Webhook id and create_time are required');

    const supabase=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const { error }=await supabase.from('payment_events').upsert({
      provider:'paypal',
      provider_event_id:providerEventId,
      event_type:normalizedType,
      occurred_at:occurredAt,
      verified:true,
      payload
    },{onConflict:'provider,provider_event_id',ignoreDuplicates:true});
    if(error) throw error;

    return Response.json({ok:true});
  } catch(error) {
    const message=error instanceof Error?error.message:'Webhook processing failed';
    return Response.json({ok:false,error:message},{status:400});
  }
});
