import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
async function get(n){const token=createHash('sha256').update('user'+n).digest('hex');const r=await fetch('http://qsl-perf2-api:3001/customers?pageSize=20',{headers:{cookie:'qsl_session='+token}});assert.equal(r.status,200);return r.json();}
const a=await get(1);assert.ok(a.total>=100000);const b=await get(50000);assert.equal(b.total,0);assert.equal(b.items.length,0);console.log('PASS: warmed customer cache does not cross store scopes');
