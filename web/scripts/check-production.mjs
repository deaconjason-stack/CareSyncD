import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRODUCTION_BASE='https://deaconjason-stack.github.io/CareSyncD/';
const TEXT_EXTS=new Set(['.js','.mjs','.html','.css','.json','.webmanifest','.md','.yml','.yaml']);
const SKIP_DIRS=new Set(['.git','node_modules']);
const SECRET_PATTERNS=[/\bsk-[A-Za-z0-9_-]{4,}/, /\bghp_[A-Za-z0-9]{4,}/, /\bgithub_pat_[A-Za-z0-9_]{4,}/, /\bAIza[A-Za-z0-9_-]{4,}/];
const RUNTIME_URL_PATTERNS=[/https?:\/\/[^\s"'`]*trycloudflare\.com/i,/https?:\/\/localhost(?::\d+)?/i,/https?:\/\/127\.0\.0\.1(?::\d+)?/i,/https?:\/\/[^\s"'`]*\.railway\.app/i,/https?:\/\/[^\s"'`]*\.vercel\.app/i];

function walk(root,dir=root){
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(SKIP_DIRS.has(entry.name)) return [];
    const full=join(dir,entry.name);
    return entry.isDirectory()?walk(root,full):[full];
  });
}
function rel(root,file){return file.slice(resolve(root).length+1).replaceAll('\\','/');}
function localRefs(file,text){
  const refs=[];
  const patterns=[
    /(?:src|href)=["'](\.{1,2}\/[^"'#?]+)["']/g,
    /\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g,
    /\bimport\s+["'](\.{1,2}\/[^"']+)["']/g,
    /\bregister\(["'](\.{1,2}\/[^"']+)["']/g
  ];
  for(const pattern of patterns){let match;while((match=pattern.exec(text)))refs.push(match[1]);}
  if(extname(file)==='.webmanifest'){
    try{const m=JSON.parse(text);for(const icon of m.icons||[])if(icon.src?.startsWith('.'))refs.push(icon.src);}catch{}
  }
  return refs;
}
function exactExists(root,file,reference){
  const base=dirname(file);
  const target=resolve(base,reference.split(/[?#]/)[0]);
  if(!target.startsWith(resolve(root))) return false;
  const relative=target.slice(resolve(root).length+1).split(/[\\/]/).filter(Boolean);
  let current=resolve(root);
  for(const segment of relative){
    if(!existsSync(current)||!statSync(current).isDirectory()) return false;
    const names=readdirSync(current);
    if(!names.includes(segment)) return false;
    current=join(current,segment);
  }
  return existsSync(current);
}

export function validateProductionTree(root){
  root=resolve(root);
  const errors=[];
  for(const file of walk(root)){
    if(!TEXT_EXTS.has(extname(file)) && !file.endsWith('.webmanifest')) continue;
    const text=readFileSync(file,'utf8');
    const name=rel(root,file);
    for(const pattern of SECRET_PATTERNS) if(pattern.test(text)) errors.push(`${name}: secret-like credential prefix detected`);
    for(const pattern of RUNTIME_URL_PATTERNS) if(pattern.test(text)) errors.push(`${name}: temporary/runtime URL detected`);
    if(/(?:src|href)=["']\/(?!\/)/.test(text)||/\b(?:from|import)\s+["']\//.test(text)) errors.push(`${name}: root-absolute local asset reference detected`);
    for(const reference of localRefs(file,text)) if(!exactExists(root,file,reference)) errors.push(`${name}: missing or case-mismatched local reference ${reference}`);
  }
  return {errors};
}

const invoked=process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url));
if(invoked){
  const {errors}=validateProductionTree(process.cwd());
  if(errors.length){for(const error of errors)console.error('ERROR',error);process.exit(1);}
  console.log('Production base:',PRODUCTION_BASE);
  console.log('Production readiness: PASS');
}
