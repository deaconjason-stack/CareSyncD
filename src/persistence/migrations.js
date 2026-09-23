import { SCHEMA_VERSION } from '../domain/schema.js';
export function migrateRecord(record){if(!record||typeof record!=='object')throw new Error('Invalid record');if(record.schemaVersion===SCHEMA_VERSION)return JSON.parse(JSON.stringify(record));throw new Error(`Unsupported schema version: ${record.schemaVersion}`);}
