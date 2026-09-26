const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function createAutosaveCoordinator({ adapter, now = () => new Date().toISOString() } = {}) {
  if (!adapter) throw new Error('adapter is required');

  return {
    async saveActive(run) {
      if (!run || typeof run !== 'object') throw new Error('active run is required');
      const snapshot = clone(run);
      snapshot.autosavedAt = now();
      return adapter.putActiveRun(snapshot);
    },

    async loadActive() {
      return adapter.getActiveRun();
    },

    async completeActive(completedRun) {
      if (!completedRun || completedRun.status !== 'complete') throw new Error('completed run is required');
      const snapshot = clone(completedRun);
      await adapter.putRun(snapshot);
      await adapter.clearActiveRun();
      return snapshot;
    },

    async clearActive() {
      await adapter.clearActiveRun();
    }
  };
}
