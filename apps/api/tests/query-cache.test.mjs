import test from 'node:test';import assert from 'node:assert/strict';import {QueryCache} from '../src/query-cache.js';
test('single flight, scope separation, invalidation and stale in-flight result',async()=>{
const cache=new QueryCache();let calls=0,release;const pending=()=>{calls++;return new Promise(r=>release=r)};
const a=cache.load('store-A',pending),b=cache.load('store-A',pending);await Promise.resolve();assert.equal(calls,1);
cache.clear();release({value:'old'});await Promise.all([a,b]);assert.deepEqual(await cache.load('store-A',()=>({value:'new'})),{value:'new'});
assert.deepEqual(await cache.load('store-B',()=>({value:'other-store'})),{value:'other-store'});
});
test('expiry, rejected loaders, and memory bound',async()=>{const c=new QueryCache({ttlMs:1,maxEntries:2,maxBytes:100});await assert.rejects(c.load('fail',()=>Promise.reject(new Error('expected'))));assert.equal(c.entries.size,0);await c.load('a',()=>1);await new Promise(r=>setTimeout(r,5));assert.equal(await c.load('a',()=>2),2);await c.load('b',()=>3);await c.load('c',()=>4);assert.ok(c.entries.size<=2);await c.load('huge',()=> 'x'.repeat(200));assert.ok(c.bytes<=100);});
