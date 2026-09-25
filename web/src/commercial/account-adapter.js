export class AccountAdapter {
  async getSession() { throw new Error('AccountAdapter.getSession not implemented'); }
  async getProfile() { throw new Error('AccountAdapter.getProfile not implemented'); }
  async getVerifiedEntitlement() { throw new Error('AccountAdapter.getVerifiedEntitlement not implemented'); }
  async saveProgressEnvelope(_envelope) { throw new Error('AccountAdapter.saveProgressEnvelope not implemented'); }
}
