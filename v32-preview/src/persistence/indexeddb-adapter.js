import { PersistenceUnavailableError, clone } from './persistence-adapter.js';
const DB='caresyncd-permanent', VERSION=1;
export class IndexedDBAdapter {
  constructor(factory=globalThis.indexedDB){this.factory=factory;this.db=null;}
  async open(){if(!this.factory)throw new PersistenceUnavailableError('IndexedDB is unavailable in this browser');this.db=await new Promise((resolve,reject)=>{const r=this.factory.open(DB,VERSION);r.onupgradeneeded=()=>{const db=r.result;for(const name of ['profiles','runs','state','meta'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('IndexedDB open failed'))});return this;}
  _store(name,mode='readonly'){if(!this.db)throw new PersistenceUnavailableError('IndexedDB is not open');return this.db.transaction(name,mode).objectStore(name)}
  _req(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(clone(req.result??null));req.onerror=()=>reject(req.error||new Error('IndexedDB request failed'))})}
  async getProfile(id){return this._req(this._store('profiles').get(id))}
  async putProfile(p){await this._req(this._store('profiles','readwrite').put(clone(p),p.learnerId));return clone(p)}
  async listProfiles(){return this._req(this._store('profiles').getAll())}
  async getActiveRun(){return this._req(this._store('state').get('active'))}
  async putActiveRun(r){await this._req(this._store('state','readwrite').put(clone(r),'active'));return clone(r)}
  async clearActiveRun(){await this._req(this._store('state','readwrite').delete('active'))}
  async listRuns(){return this._req(this._store('runs').getAll())}
  async putRun(r){await this._req(this._store('runs','readwrite').put(clone(r),r.runId));return clone(r)}
  async getMeta(k){return this._req(this._store('meta').get(k))}
  async putMeta(k,v){await this._req(this._store('meta','readwrite').put(clone(v),k));return clone(v)}
  async dump(){return {profiles:await this.listProfiles(),runs:await this.listRuns(),active:await this.getActiveRun(),meta:{}}}
  async replaceAll(bundle){const tx=this.db.transaction(['profiles','runs','state','meta'],'readwrite');for(const n of ['profiles','runs','state','meta'])tx.objectStore(n).clear();for(const p of bundle.profiles||[])tx.objectStore('profiles').put(clone(p),p.learnerId);for(const r of bundle.runs||[])tx.objectStore('runs').put(clone(r),r.runId);if(bundle.active)tx.objectStore('state').put(clone(bundle.active),'active');for(const [k,v] of Object.entries(bundle.meta||{}))tx.objectStore('meta').put(clone(v),k);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('IndexedDB replace failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB replace aborted'))});}
}
