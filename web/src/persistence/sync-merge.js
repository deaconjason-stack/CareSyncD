const clone = value => value == null ? value : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

function stamp(record, fields) {
  for (const field of fields) {
    const value = record?.[field];
    if (value) {
      const time = Date.parse(value);
      if (Number.isFinite(time)) return time;
    }
  }
  return 0;
}

function newer(a, b, fields) {
  if (!a) return clone(b);
  if (!b) return clone(a);
  return clone(stamp(b, fields) > stamp(a, fields) ? b : a);
}

function mergeById(local = [], remote = [], idField, fields) {
  const merged = new Map();
  for (const item of [...local, ...remote]) {
    if (!item?.[idField]) continue;
    const id = item[idField];
    merged.set(id, newer(merged.get(id), item, fields));
  }
  return [...merged.values()].sort((a,b) => String(a[idField]).localeCompare(String(b[idField])));
}

export function mergeProgressBundles(local = {}, remote = {}) {
  const localActive = clone(local.active ?? null);
  const remoteActive = clone(remote.active ?? null);
  const conflicts = [];
  let active = null;

  if (localActive && remoteActive) {
    if (localActive.runId === remoteActive.runId) {
      active = newer(localActive, remoteActive, ['autosavedAt','updatedAt','endTime']);
    } else {
      conflicts.push({type:'active-run',local:localActive,remote:remoteActive});
    }
  } else {
    active = clone(localActive ?? remoteActive ?? null);
  }

  return {
    bundle:{
      profiles:mergeById(local.profiles ?? [], remote.profiles ?? [], 'learnerId', ['updatedAt','createdAt']),
      runs:mergeById(local.runs ?? [], remote.runs ?? [], 'runId', ['updatedAt','endTime','autosavedAt']),
      active,
      meta:{...clone(local.meta ?? {}),...clone(remote.meta ?? {})}
    },
    conflicts
  };
}
