import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const read=p=>readFileSync(join(process.cwd(),p),'utf8');

test('permanent shell exposes safety copy and primary navigation',()=>{
  const html=read('index.html');
  assert.match(html,/Educational simulation only\. Not for real-patient diagnosis, monitoring, or treatment\./);
  for(const label of ['Home','Clinical Missions','Hospital Shifts','Progress','Debriefs','Instructor','Settings']) assert.match(html,new RegExp(label));
  assert.match(html,/manifest\.webmanifest/);
});

test('manifest is repository-subpath safe and installable',()=>{
  const m=JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.start_url,'./'); assert.equal(m.scope,'./'); assert.equal(m.display,'standalone');
  assert.ok(m.icons.some(i=>i.sizes==='192x192'));
  assert.ok(m.icons.some(i=>i.sizes==='512x512'));
});

test('service worker caches the offline shell with relative URLs',()=>{
  const sw=read('service-worker.js');
  for(const asset of ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest']) assert.match(sw,new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(sw,/https:\/\/[^'"`]+/);
});

test('generated install icons exist',()=>{
  assert.ok(existsSync('public/icons/icon-192.png'));
  assert.ok(existsSync('public/icons/icon-512.png'));
});


test('waiting service worker only activates through explicit safe update flow',()=>{
  const sw=read('service-worker.js');
  const app=read('app.js');
  assert.match(sw,/SKIP_WAITING/);
  assert.match(sw,/self\.skipWaiting\(\)/);
  assert.match(app,/state\.active/);
  assert.match(app,/postMessage\(\{type:'SKIP_WAITING'\}\)/);
  assert.match(app,/controllerchange/);
});
