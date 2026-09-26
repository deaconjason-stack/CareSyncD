export function createUpdateCoordinator({ getActiveRun, postSkipWaiting, reload } = {}) {
  if (typeof getActiveRun !== 'function') throw new Error('getActiveRun is required');
  if (typeof postSkipWaiting !== 'function') throw new Error('postSkipWaiting is required');
  if (typeof reload !== 'function') throw new Error('reload is required');

  let waitingWorker = null;
  let applying = false;
  let reloaded = false;

  return {
    notifyWaiting(worker) {
      waitingWorker = worker ?? null;
      return Boolean(waitingWorker);
    },

    async applyWhenSafe() {
      if (!waitingWorker) return {applied:false,reason:'no-update'};
      const active = await getActiveRun();
      if (active) return {applied:false,reason:'active-run'};
      const worker = waitingWorker;
      waitingWorker = null;
      applying = true;
      postSkipWaiting(worker);
      return {applied:true};
    },

    handleControllerChange() {
      if (applying && !reloaded) {
        reloaded = true;
        reload();
      }
    },

    hasWaitingUpdate() {
      return Boolean(waitingWorker);
    }
  };
}
