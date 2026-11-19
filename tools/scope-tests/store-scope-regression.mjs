import assert from 'node:assert/strict';
const base='http://qsl-scope-api:3001';let r=await fetch(base+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'杨法智',password:'Admin@1234'})});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
async function get(path){const r=await fetch(base+path,{headers:{cookie}});return {status:r.status,data:await r.json()};}
const stores=(await get('/stores')).data.items;const ids=stores.slice(0,2).map(s=>s.id);
for(const path of ['/customers','/products','/staff','/purchase/orders','/pricing/categories','/pricing/items','/catalog/suppliers','/catalog/warehouses']){
 const all=await get(path);assert.equal(all.status,200,path+JSON.stringify(all.data));const rows=Array.isArray(all.data)?all.data:(all.data.items??all.data.rows);assert.equal(rows.length,2,path+' all');
 for(const id of ids){const x=await get(path+'?storeId='+id);assert.equal(x.status,200,path+JSON.stringify(x.data));const items=Array.isArray(x.data)?x.data:(x.data.items??x.data.rows);assert.equal(items.length,1,path+' single');if(x.data.total!==undefined)assert.equal(x.data.total,1,path+' total');const owner=items[0].store_id??items[0].storeId;if(owner)assert.equal(owner,id,path+' wrong store');}
 assert.equal((await get(path+'?storeId=00000000-0000-4000-8000-000000000000')).status,403,path+' invalid scope');
 console.log('PASS '+path+' all/A/B/unauthorized');
}
for(const id of ids){const x=await get('/overview?storeId='+id);assert.equal(x.status,200);assert.equal(x.data.stores,1);assert.equal(x.data.customers,1);assert.equal(x.data.products,1);assert.equal(x.data.orders,1);}console.log('PASS scoped dashboard');
