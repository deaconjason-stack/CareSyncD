import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const webRoot=resolve(here,'../..');
const read=path=>readFile(resolve(webRoot,path),'utf8');

test('v3.2 preview has explicit release identity in package and manifest',async()=>{
  const [pkgText,manifestText]=await Promise.all([read('package.json'),read('manifest.webmanifest')]);
  const pkg=JSON.parse(pkgText);
  const manifest=JSON.parse(manifestText);
  assert.match(pkg.version,/^3\.2\.0/);
  assert.match(manifest.name,/CareSyncD v3\.2 Preview/i);
  assert.match(manifest.description,/educational/i);
  assert.equal(manifest.start_url,'./');
  assert.equal(manifest.scope,'./');
});

test('service worker uses a v3.2 cache and precaches the integrated preview shell',async()=>{
  const sw=await read('service-worker.js');
  assert.match(sw,/caresyncd-v3\.2-preview/);
  for(const asset of [
    './','./index.html','./styles.css','./v32.css','./app.js','./v32-entry.js','./manifest.webmanifest',
    './src/app/v32-shell.js','./src/app/v32-preview-runtime.js',
    './src/living-hospital/unit-catalog.js','./src/ui/career-map-view-model.js',
    './src/ui/founder-dashboard-view-model.js','./src/commercial/entitlement-engine.js'
  ]) assert.match(sw,new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(sw,/SKIP_WAITING/);
  assert.match(sw,/self\.skipWaiting\(\)/);
});

test('PWA release files do not contain server-side credential material',async()=>{
  const contents=(await Promise.all([
    read('index.html'),read('v32-entry.js'),read('service-worker.js'),read('manifest.webmanifest')
  ])).join('\n');
  for(const forbidden of [
    /SUPABASE_SERVICE_ROLE_KEY/i,/PAYPAL_CLIENT_SECRET/i,/PAYPAL_WEBHOOK_ID/i,
    /sb_secret_/i,/service[_-]?role\s*[:=]/i
  ]) assert.doesNotMatch(contents,forbidden);
});

test('legacy offline shell and safe-update contract remain represented',async()=>{
  const sw=await read('service-worker.js');
  for(const asset of [
    './src/app/session-controller.js','./src/data/scenarios.js','./src/data/shifts.js',
    './src/engine/simulation-engine.js','./src/persistence/indexeddb-adapter.js'
  ]) assert.match(sw,new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
