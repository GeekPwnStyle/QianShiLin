import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const base='http://qsl-perf2-api:3001',headers={cookie:'qsl_session='+createHash('sha256').update('user1').digest('hex'),'content-type':'application/json'};
const before=await (await fetch(base+'/customers?pageSize=20',{headers})).json();const customer=before.items[0];
const r=await fetch(base+'/customers/batch-visit',{method:'POST',headers,body:JSON.stringify({ids:[customer.id],visitDate:'2026-11-19'})});assert.equal(r.status,200);const saved=await r.json();assert.equal(saved.updatedCount,1);
const after=await(await fetch(base+'/customers?pageSize=20',{headers})).json();assert.notDeepEqual(after.items.find(x=>x.id===customer.id),customer);console.log('PASS customer mutation invalidates warmed list immediately');
