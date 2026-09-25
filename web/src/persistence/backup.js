import { SCHEMA_VERSION } from '../domain/schema.js';
import { migrateRecord } from './migrations.js';

const SUPPORTED_BACKUP_VERSIONS = new Set([1, SCHEMA_VERSION]);
const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export async function exportProgress(adapter) {
  const data = await adapter.dump();
  return JSON.stringify({
    format:'caresyncd-progress',
    schemaVersion:SCHEMA_VERSION,
    exportedAt:new Date().toISOString(),
    ...data
  }, null, 2);
}

export async function importProgress(adapter, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid backup JSON');
  }

  if (parsed?.format !== 'caresyncd-progress') throw new Error('Invalid CareSyncD backup');
  if (!SUPPORTED_BACKUP_VERSIONS.has(parsed.schemaVersion)) {
    throw new Error(`Unsupported backup schema version: ${parsed.schemaVersion}`);
  }

  const next = {
    profiles:(Array.isArray(parsed.profiles) ? parsed.profiles : []).map(migrateRecord),
    runs:(Array.isArray(parsed.runs) ? parsed.runs : []).map(migrateRecord),
    active:parsed.active ? migrateRecord(parsed.active) : null,
    meta:parsed.meta && typeof parsed.meta === 'object' ? clone(parsed.meta) : {}
  };

  const previous = await adapter.dump();
  try {
    await adapter.replaceAll(next);
  } catch (error) {
    await adapter.replaceAll(previous);
    throw error;
  }
  return next;
}
