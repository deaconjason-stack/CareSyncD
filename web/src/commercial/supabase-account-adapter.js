import { AccountAdapter } from './account-adapter.js';

function throwIfError(error, fallback) {
  if (!error) return;
  const message = typeof error?.message === 'string' ? error.message : fallback;
  throw new Error(message);
}

export class SupabaseAccountAdapter extends AccountAdapter {
  constructor(client) {
    super();
    if (!client || typeof client !== 'object') throw new TypeError('Supabase client is required');
    this.client = client;
  }

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    throwIfError(error, 'Unable to load session');
    return data?.session ?? null;
  }

  async requireAccountId() {
    const session = await this.getSession();
    const accountId = session?.user?.id;
    if (!accountId) throw new Error('Authenticated account is required');
    return accountId;
  }

  async getProfile() {
    const accountId = await this.requireAccountId();
    const { data, error } = await this.client
      .from('account_profiles')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();
    throwIfError(error, 'Unable to load account profile');
    if (!data) return null;
    return {
      accountId: data.account_id,
      displayName: data.display_name ?? null,
      createdAt: data.created_at ?? null,
      updatedAt: data.updated_at ?? null
    };
  }

  async getVerifiedEntitlement() {
    const accountId = await this.requireAccountId();
    const { data, error } = await this.client
      .from('entitlement_snapshots')
      .select('*')
      .eq('account_id', accountId)
      .eq('verified_by_server', true)
      .order('issued_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    throwIfError(error, 'Unable to load verified entitlement');
    if (!data) return null;
    return {
      accountId: data.account_id,
      planId: data.plan_id,
      features: Array.isArray(data.features) ? [...data.features] : [],
      verifiedByServer: data.verified_by_server === true,
      issuedAt: data.issued_at,
      expiresAt: data.expires_at
    };
  }

  async saveProgressEnvelope(envelope) {
    if (!envelope || typeof envelope !== 'object') throw new TypeError('progress envelope is required');
    const accountId = await this.requireAccountId();
    const { data, error } = await this.client.rpc('save_progress_envelope', {
      p_account_id: accountId,
      p_envelope: envelope
    });
    throwIfError(error, 'Unable to save progress envelope');
    return data;
  }
}
