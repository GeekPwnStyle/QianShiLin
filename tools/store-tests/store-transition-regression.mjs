import assert from 'node:assert/strict';
const headers={cookie:'qsl_session='+'c'.repeat(64),'content-type':'application/json'};
async function api(path,method='GET',body){const r=await fetch('http://qsl-stores-api:3001'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
let r=await api('/session');assert.equal(r.status,200);assert.equal(r.data.user.username,'杨法智');assert.equal(r.data.user.store_ids.length,17);
r=await api('/stores');assert.equal(r.status,200);assert.equal(r.data.items.length,17);assert.equal(new Set(r.data.items.map(x=>x.storeCode)).size,17);assert.ok(r.data.items.every(x=>x.brand==='摩斯莫西'&&!x.providesProcessing));
const saved=r.data;
assert.equal((await api('/stores','PUT',{...saved,revision:-1})).status,409);
const duplicate=structuredClone(saved);duplicate.items[0].storeCode=duplicate.items[1].storeCode;assert.equal((await api('/stores','PUT',duplicate)).status,400);
assert.equal((await api('/stores','PUT',saved)).status,200);
assert.equal((await api('/stores','PUT',saved)).status,409);
for(const p of ['/customers','/products','/catalog/suppliers','/catalog/brands']){const x=await api(p);assert.equal(x.status,200,p+JSON.stringify(x.data));const values=Array.isArray(x.data)?x.data:x.data.items;assert.equal(values.length,0,p+' must not reseed demo data');}
r=await api('/overview');assert.equal(r.status,200);assert.equal(r.data.stores,17);assert.equal(r.data.customers,0);assert.equal(r.data.products,0);assert.equal(r.data.orders,0);
console.log('PASS real administrator, 17 real stores, global save persistence/version conflict, duplicate validation, demo cleanup and no reseeding, real dashboard totals');
