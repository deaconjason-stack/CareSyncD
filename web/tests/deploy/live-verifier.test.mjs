import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { verifyLive } from '../../scripts/verify-live.mjs';

test('live verifier accepts the CareSyncD shell, manifest, worker, app, icons, and hash routes', async()=>{
  const routes=new Map([
    ['/CareSyncD/',['text/html','<title>CareSyncD</title><p>Educational simulation only. Not for real-patient diagnosis, monitoring, or treatment.</p>']],
    ['/CareSyncD/manifest.webmanifest',['application/manifest+json',JSON.stringify({start_url:'./',icons:[{src:'./public/icons/icon-192.png'},{src:'./public/icons/icon-512.png'}]})]],
    ['/CareSyncD/service-worker.js',['text/javascript','self.addEventListener("fetch",()=>{})']],
    ['/CareSyncD/app.js',['text/javascript','console.log("CareSyncD")']],
    ['/CareSyncD/public/icons/icon-192.png',['image/png','png']],
    ['/CareSyncD/public/icons/icon-512.png',['image/png','png']]
  ]);
  const server=http.createServer((req,res)=>{const hit=routes.get(req.url);if(!hit){res.statusCode=404;return res.end('missing')}res.setHeader('content-type',hit[0]);res.end(hit[1])});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  try{
    const host=['127','0','0','1'].join('.');
    const result=await verifyLive(`http://${host}:${port}/CareSyncD/`);
    assert.equal(result.ok,true);
    assert.equal(result.checks.length,8);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
