const CACHE='caresyncd-v3.2-preview-1';
const ASSETS=[
  './','./index.html','./styles.css','./v32.css','./app.js','./v32-entry.js','./manifest.webmanifest',
  './public/icons/icon-192.png','./public/icons/icon-512.png',

  // Preserved v3.1 mission/shift shell.
  './src/app/session-controller.js','./src/domain/schema.js',
  './src/data/actions.js','./src/data/scenarios.js','./src/data/shifts.js',
  './src/engine/simulation-engine.js','./src/engine/shift-engine.js','./src/engine/event-bus.js','./src/engine/scoring-engine.js',
  './src/persistence/persistence-adapter.js','./src/persistence/indexeddb-adapter.js','./src/persistence/memory-adapter.js','./src/persistence/migrations.js','./src/persistence/backup.js',
  './src/ui/view-model.js',

  // v3.2 integrated preview shell/runtime.
  './src/app/v32-shell.js','./src/app/v32-preview-runtime.js',
  './src/ui/career-map-view-model.js','./src/ui/founder-dashboard-view-model.js',
  './src/commercial/entitlement-engine.js',

  // Six-unit Living Hospital catalog and career dependencies.
  './src/living-hospital/unit-catalog.js','./src/living-hospital/career-trees.js','./src/living-hospital/progression-engine.js',
  './src/living-hospital/units/unit-contract.js','./src/living-hospital/units/med-surg.js','./src/living-hospital/units/emergency.js',
  './src/living-hospital/units/telemetry.js','./src/living-hospital/units/icu.js','./src/living-hospital/units/pediatrics.js','./src/living-hospital/units/ob.js'
];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match('./index.html'))));
});
