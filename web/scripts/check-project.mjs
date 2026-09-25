import { existsSync } from 'node:fs';
const required=['package.json','src/data/actions.js','src/data/scenarios.js','src/data/shifts.js','src/engine/simulation-engine.js','src/engine/shift-engine.js','src/persistence/indexeddb-adapter.js','src/app/session-controller.js','index.html','app.js','styles.css','manifest.webmanifest','service-worker.js','public/icons/icon-192.png','public/icons/icon-512.png'];
let ok=true;for(const f of required){if(!existsSync(f)){console.error('Missing',f);ok=false}else console.log('OK',f)}process.exit(ok?0:1);
