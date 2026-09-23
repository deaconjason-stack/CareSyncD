import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateProductionTree, PRODUCTION_BASE } from '../../scripts/check-production.mjs';

test('production base resolves repository-subpath assets',()=>{
  assert.equal(new URL('./app.js', PRODUCTION_BASE).href,'https://deaconjason-stack.github.io/CareSyncD/app.js');
  assert.equal(new URL('./manifest.webmanifest', PRODUCTION_BASE).href,'https://deaconjason-stack.github.io/CareSyncD/manifest.webmanifest');
});

test('current CareSyncD tree passes production readiness',()=>{
  const result=validateProductionTree(process.cwd());
  assert.deepEqual(result.errors,[]);
});

test('secret prefixes and temporary runtime URLs are rejected',()=>{
  const root=mkdtempSync(join(tmpdir(),'caresyncd-prod-check-'));
  mkdirSync(join(root,'src'));
  writeFileSync(join(root,'index.html'),['<script src=".','/src/app.js"></script>'].join(''));
  writeFileSync(join(root,'src/app.js'),"const key='"+'sk-'+'test'+"'; const url='"+'https://x.'+'trycloudflare.com'+"';");
  const result=validateProductionTree(root);
  assert.ok(result.errors.some(e=>e.includes('secret-like')));
  assert.ok(result.errors.some(e=>e.includes('temporary/runtime URL')));
});
