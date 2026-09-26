import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(here,'../../..');
const read=path=>readFile(resolve(repoRoot,path),'utf8');

test('preview workflow is restricted to the v3.2 branch and a deliberate trigger',async()=>{
  const workflow=await read('.github/workflows/v32-preview.yml');
  assert.match(workflow,/v3\.2-living-hospital/);
  assert.match(workflow,/workflow_dispatch/);
  assert.match(workflow,/v32-preview-trigger\.txt/);
  assert.doesNotMatch(workflow,/branches:\s*\[?\s*main/i);
});

test('preview workflow verifies the application before publishing',async()=>{
  const workflow=await read('.github/workflows/v32-preview.yml');
  for(const command of ['node --test tests/v32/*.test.js','npm test','npm run check','npm run check:site','npm run check:production']){
    assert.match(workflow,new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
});

test('preview publication can modify only the v32-preview subdirectory on gh-pages',async()=>{
  const workflow=await read('.github/workflows/v32-preview.yml');
  assert.match(workflow,/ref:\s*gh-pages/);
  assert.match(workflow,/v32-preview/);
  assert.match(workflow,/git add -- v32-preview/);
  assert.match(workflow,/TARGET_REL="v32-preview"/);
  assert.match(workflow,/\[ "\$TARGET_REL" = "v32-preview" \]/);
  assert.doesNotMatch(workflow,/git checkout --orphan/);
  assert.doesNotMatch(workflow,/rm\s+-rf\s+\.\s*(?:$|\n)/m);
  assert.doesNotMatch(workflow,/git add\s+-A/);
});

test('preview workflow copies the verified browser release and never production root',async()=>{
  const workflow=await read('.github/workflows/v32-preview.yml');
  assert.match(workflow,/source\/web/);
  assert.match(workflow,/pages\/v32-preview/);
  assert.match(workflow,/CareSyncD v3\.2 preview/i);
});
