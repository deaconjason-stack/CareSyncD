import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl=new URL('../../../supabase/migrations/20260925_phase5_performance.sql',import.meta.url);

test('Phase 5 performance follow-up covers organizations.created_by foreign key',async()=>{
  const sql=(await readFile(migrationUrl,'utf8')).toLowerCase();
  assert.match(sql,/create index if not exists organizations_created_by_idx\s+on public\.organizations\(created_by\)/);
});
