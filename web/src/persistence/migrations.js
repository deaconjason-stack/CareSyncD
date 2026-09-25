import { SCHEMA_VERSION } from '../domain/schema.js';

const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function migrateRecord(record) {
  if (!record || typeof record !== 'object') throw new Error('Invalid record');
  if (record.schemaVersion === SCHEMA_VERSION) return clone(record);
  if (record.schemaVersion === 1) {
    const migrated = clone(record);
    migrated.schemaVersion = SCHEMA_VERSION;
    return migrated;
  }
  throw new Error(`Unsupported schema version: ${record.schemaVersion}`);
}
