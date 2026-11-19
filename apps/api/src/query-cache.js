// Short-lived, bounded cache. Authorization is checked before each lookup.
export class QueryCache {
  constructor({ttlMs=1000,maxEntries=256,maxBytes=32*1024*1024}={}) {
    this.ttlMs=ttlMs;this.maxEntries=maxEntries;this.maxBytes=maxBytes;
    this.entries=new Map();this.bytes=0;this.generation=0;
  }
  clear(){this.entries.clear();this.bytes=0;this.generation++;}
  async load(key,loader){
    const now=Date.now(), existing=this.entries.get(key);
    if(existing && (existing.pending || existing.expires>now)) return existing.promise;
    if(existing){this.bytes-=existing.bytes;this.entries.delete(key);}
    while(this.entries.size>=this.maxEntries){const k=this.entries.keys().next().value;this.bytes-=this.entries.get(k).bytes;this.entries.delete(k);}
    const generation=this.generation, entry={bytes:0,expires:0,pending:true};
    entry.promise=Promise.resolve().then(loader).then(value=>{
      if(this.generation===generation && this.entries.get(key)===entry){
        entry.bytes=Buffer.byteLength(JSON.stringify(value));entry.pending=false;entry.expires=Date.now()+this.ttlMs;this.bytes+=entry.bytes;
        while(this.bytes>this.maxBytes && this.entries.size){const k=this.entries.keys().next().value;this.bytes-=this.entries.get(k).bytes;this.entries.delete(k);}
      }
      return value;
    },error=>{if(this.entries.get(key)===entry)this.entries.delete(key);throw error;});
    this.entries.set(key,entry);return entry.promise;
  }
}
export const customerListCache=new QueryCache();
