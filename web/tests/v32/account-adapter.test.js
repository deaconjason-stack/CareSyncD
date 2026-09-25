import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountAdapter } from '../../src/commercial/account-adapter.js';
import { SupabaseAccountAdapter } from '../../src/commercial/supabase-account-adapter.js';

function fakeQuery(result, calls) {
  const query = {
    select(value){ calls.push(['select',value]); return query; },
    eq(column,value){ calls.push(['eq',column,value]); return query; },
    order(column,options){ calls.push(['order',column,options]); return query; },
    limit(value){ calls.push(['limit',value]); return query; },
    async maybeSingle(){ calls.push(['maybeSingle']); return result; }
  };
  return query;
}

function makeClient({session={user:{id:'acct-1'}},profile={account_id:'acct-1',display_name:'Jason'},entitlement={account_id:'acct-1',plan_id:'individual',features:['living-hospital'],verified_by_server:true,issued_at:'2026-10-01T00:00:00Z',expires_at:'2026-10-05T00:00:00Z'},sessionError=null,profileError=null,entitlementError=null,rpcError=null}={}) {
  const calls=[];
  return {
    calls,
    auth:{ async getSession(){ calls.push(['getSession']); return {data:{session},error:sessionError}; } },
    from(table){
      calls.push(['from',table]);
      if(table==='account_profiles') return fakeQuery({data:profile,error:profileError},calls);
      if(table==='entitlement_snapshots') return fakeQuery({data:entitlement,error:entitlementError},calls);
      throw new Error(`unexpected table ${table}`);
    },
    async rpc(name,args){ calls.push(['rpc',name,args]); return {data:{ok:true},error:rpcError}; }
  };
}

test('base AccountAdapter documents required methods by rejecting direct use', async()=>{
  const adapter=new AccountAdapter();
  await assert.rejects(()=>adapter.getSession(),/not implemented/i);
  await assert.rejects(()=>adapter.getProfile(),/not implemented/i);
  await assert.rejects(()=>adapter.getVerifiedEntitlement(),/not implemented/i);
  await assert.rejects(()=>adapter.saveProgressEnvelope({}),/not implemented/i);
});

test('Supabase adapter normalizes session and scopes profile reads to current account', async()=>{
  const client=makeClient();
  const adapter=new SupabaseAccountAdapter(client);
  const session=await adapter.getSession();
  assert.equal(session.user.id,'acct-1');
  const profile=await adapter.getProfile();
  assert.equal(profile.displayName,'Jason');
  assert.ok(client.calls.some(call=>call[0]==='eq'&&call[1]==='account_id'&&call[2]==='acct-1'));
});

test('verified entitlement read is account scoped and normalized for entitlement engine', async()=>{
  const client=makeClient();
  const adapter=new SupabaseAccountAdapter(client);
  const entitlement=await adapter.getVerifiedEntitlement();
  assert.deepEqual(entitlement,{
    accountId:'acct-1',planId:'individual',features:['living-hospital'],verifiedByServer:true,
    issuedAt:'2026-10-01T00:00:00Z',expiresAt:'2026-10-05T00:00:00Z'
  });
  assert.ok(client.calls.some(call=>call[0]==='eq'&&call[1]==='verified_by_server'&&call[2]===true));
});

test('progress envelope uses a server RPC instead of direct privileged table mutation', async()=>{
  const client=makeClient();
  const adapter=new SupabaseAccountAdapter(client);
  const envelope={schemaVersion:4,profile:{id:'acct-1'}};
  const result=await adapter.saveProgressEnvelope(envelope);
  assert.deepEqual(result,{ok:true});
  assert.ok(client.calls.some(call=>call[0]==='rpc'&&call[1]==='save_progress_envelope'));
});

test('Supabase errors propagate clearly instead of silently granting access', async()=>{
  const adapter=new SupabaseAccountAdapter(makeClient({entitlementError:{message:'network failed'}}));
  await assert.rejects(()=>adapter.getVerifiedEntitlement(),/network failed/i);
});

test('adapter accepts only an injected client and contains no browser service-role configuration',()=>{
  assert.throws(()=>new SupabaseAccountAdapter(),/client/i);
  const source=SupabaseAccountAdapter.toString().toLowerCase();
  assert.doesNotMatch(source,/service_role|service-role|paypal_client_secret/);
});
