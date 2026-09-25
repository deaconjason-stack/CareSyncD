import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

async function fetchOk(url,label){
  const response=await fetch(url,{redirect:'follow'});
  if(!response.ok) throw new Error(`${label}: HTTP ${response.status} for ${url}`);
  return response;
}

export async function verifyLive(baseUrl){
  const base=new URL(baseUrl);
  if(!base.pathname.endsWith('/')) base.pathname += '/';
  const checks=[];
  const root=await fetchOk(base,'root');
  const html=await root.text();
  if(!html.includes('CareSyncD')) throw new Error('root: CareSyncD marker missing');
  if(!html.includes('Educational simulation only. Not for real-patient diagnosis, monitoring, or treatment.')) throw new Error('root: safety statement missing');
  checks.push('root');

  const manifestUrl=new URL('./manifest.webmanifest',base);
  const manifestResponse=await fetchOk(manifestUrl,'manifest');
  const manifest=await manifestResponse.json();
  const start=new URL(manifest.start_url||'./',manifestUrl);
  if(!start.href.startsWith(base.href)) throw new Error(`manifest: start_url escapes app base (${start.href})`);
  checks.push('manifest');

  await fetchOk(new URL('./service-worker.js',base),'service-worker'); checks.push('service-worker');
  await fetchOk(new URL('./app.js',base),'app'); checks.push('app');
  for(const [index,icon] of (manifest.icons||[]).entries()){
    await fetchOk(new URL(icon.src,manifestUrl),`icon-${index}`);
    checks.push(`icon-${index}`);
  }
  if((manifest.icons||[]).length<2) throw new Error('manifest: expected at least two install icons');

  for(const route of ['#/hospital-shifts','#/progress']){
    const response=await fetchOk(new URL(route,base),`route-${route}`);
    const body=await response.text();
    if(!body.includes('CareSyncD')) throw new Error(`route-${route}: app shell missing`);
    checks.push(`route-${route}`);
  }
  return {ok:true,base:base.href,checks};
}

const invoked=process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url));
if(invoked){
  const url=process.argv[2];
  if(!url){console.error('Usage: node scripts/verify-live.mjs <base-url>');process.exit(2);}
  try{
    const result=await verifyLive(url);
    for(const check of result.checks) console.log('PASS',check);
    console.log('Live verification: PASS',result.base);
  }catch(error){console.error('Live verification: FAIL',error.message);process.exit(1);}
}
