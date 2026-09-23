const CACHE='caresyncd-permanent-v3.1.0';
const ASSETS=[
  './','./index.html','./styles.css','./app.js','./manifest.webmanifest',
  './public/icons/icon-192.png','./public/icons/icon-512.png',
  './src/app/session-controller.js','./src/domain/schema.js',
  './src/data/actions.js','./src/data/scenarios.js','./src/data/shifts.js',
  './src/engine/simulation-engine.js','./src/engine/shift-engine.js','./src/engine/event-bus.js','./src/engine/scoring-engine.js',
  './src/persistence/persistence-adapter.js','./src/persistence/indexeddb-adapter.js','./src/persistence/memory-adapter.js','./src/persistence/migrations.js','./src/persistence/backup.js',
  './src/ui/view-model.js'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match('./index.html'))));
});
