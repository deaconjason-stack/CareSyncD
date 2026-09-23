import { clone } from './persistence-adapter.js';
export class MemoryAdapter {
  constructor(seed={}){this.profiles=new Map();this.runs=new Map();this.meta=new Map();this.active=null;this.seed=seed;this.opened=false;}
  async open(){if(this.opened)return this;for(const p of this.seed.profiles||[])this.profiles.set(p.learnerId,clone(p));for(const r of this.seed.runs||[])this.runs.set(r.runId,clone(r));this.active=clone(this.seed.active||null);this.opened=true;return this;}
  async getProfile(id){return clone(this.profiles.get(id)||null)}
  async putProfile(p){this.profiles.set(p.learnerId,clone(p));return clone(p)}
  async listProfiles(){return [...this.profiles.values()].map(clone)}
  async getActiveRun(){return clone(this.active)}
  async putActiveRun(r){this.active=clone(r);return clone(r)}
  async clearActiveRun(){this.active=null}
  async listRuns(){return [...this.runs.values()].map(clone)}
  async putRun(r){this.runs.set(r.runId,clone(r));return clone(r)}
  async getMeta(k){return clone(this.meta.get(k)??null)}
  async putMeta(k,v){this.meta.set(k,clone(v));return clone(v)}
  async replaceAll(bundle){this.profiles=new Map((bundle.profiles||[]).map(p=>[p.learnerId,clone(p)]));this.runs=new Map((bundle.runs||[]).map(r=>[r.runId,clone(r)]));this.active=clone(bundle.active||null);this.meta=new Map(Object.entries(bundle.meta||{}).map(([k,v])=>[k,clone(v)]));}
  async dump(){return {profiles:await this.listProfiles(),runs:await this.listRuns(),active:await this.getActiveRun(),meta:Object.fromEntries([...this.meta.entries()].map(([k,v])=>[k,clone(v)]))};}
}
