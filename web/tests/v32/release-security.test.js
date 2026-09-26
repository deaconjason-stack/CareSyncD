import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const webRoot=resolve(here,'../..');
const repoRoot=resolve(webRoot,'..');

async function filesUnder(dir){
  const out=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(['tests','node_modules','scripts'].includes(entry.name)) continue;
    const full=resolve(dir,entry.name);
    if(entry.isDirectory()) out.push(...await filesUnder(full));
    else if(/\.(?:js|html|css|json|webmanifest)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

test('browser release surface contains no server credential values or secret-key assignments',async()=>{
  const files=await filesUnder(webRoot);
  assert.ok(files.length>20);
  const forbidden=[
    /sb_secret_[A-Za-z0-9_-]{8,}/,
    /sk_live_[A-Za-z0-9_-]{8,}/,
    /PAYPAL_CLIENT_SECRET\s*[:=]\s*["'][^"']+["']/i,
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/i,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  ];
  for(const path of files){
    const text=await readFile(path,'utf8');
    for(const pattern of forbidden){
      assert.doesNotMatch(text,pattern,`${relative(webRoot,path)} contains forbidden credential material`);
    }
  }
});

test('production safety language remains explicit in the integrated preview',async()=>{
  const index=await readFile(resolve(webRoot,'index.html'),'utf8');
  assert.match(index,/Educational simulation only\. Not for real-patient diagnosis, monitoring, or treatment\./i);
  assert.match(index,/Not clinical decision support/i);
  assert.match(index,/Never enter PHI/i);
});

test('release verification document pins preview source, preview publish, and v3.1 rollback SHAs',async()=>{
  const doc=await readFile(resolve(repoRoot,'docs/releases/caresyncd-v3.2-preview-verification.md'),'utf8');
  assert.match(doc,/a0b090d85e34332f4588735b13786e9726566c4f/);
  assert.match(doc,/10cc91c7812ce238a8fc77a367136bfa540fded9/);
  assert.match(doc,/af86ff1e6a0839bd505936acb2e4775d54389a5a/);
  assert.match(doc,/only files under `v32-preview\/`/i);
  assert.match(doc,/production root.*unchanged/i);
  assert.match(doc,/rollback/i);
});

test('preview deployment workflow remains subdirectory-only after audit',async()=>{
  const workflow=await readFile(resolve(repoRoot,'.github/workflows/v32-preview.yml'),'utf8');
  assert.match(workflow,/git add -- v32-preview/);
  assert.doesNotMatch(workflow,/git add\s+-A/);
  assert.doesNotMatch(workflow,/git checkout --orphan/);
});
