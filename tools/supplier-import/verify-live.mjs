import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { handleCatalog } from '/app/src/catalog.js';
const { Pool } = createRequire('/app/package.json')('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
 const {rows:[admin]} = await pool.query(`SELECT u.id FROM identity.users u JOIN identity.user_access a ON a.user_id=u.id JOIN identity.roles r ON r.id=a.role_id WHERE r.identity_type='admin' AND 'basic.supplier.read'=ANY(r.permissions) AND NOT ('basic.supplier.read'=ANY(a.permission_denies)) LIMIT 1`);
 assert.ok(admin, 'admin fixture exists');
 const call = async (path,user=admin) => {
  let result;
  const handled = await handleCatalog({req:{method:'GET'},res:{},url:new URL('http://local'+path),user,pool,send:(_res,status,body)=>{result={status,body};},readJson:async()=>({})});
  assert.equal(handled,true); return result;
 };
 const before = (await pool.query('SELECT count(*)::int AS n FROM identity.users')).rows[0].n;
 const list = await call('/catalog/suppliers/legacy-accounts');
 assert.equal(list.status,200); assert.equal(list.body.total,11);
 const zyy=list.body.items.find(a=>a.username==='ZYY');
 const msmx=list.body.items.find(a=>a.username==='msmx');
 assert.equal(zyy.supplier_count,86); assert.equal(msmx.supplier_count,87);
 const details=await call('/catalog/suppliers/legacy-accounts/'+zyy.id);
 assert.equal(details.body.items.length,86);
 assert.ok(details.body.items.some(s=>s.name==='超任眼镜(富丽城店)'));
 assert.ok(!details.body.items.some(s=>s.name==='精诚眼镜(月结镜片)'));
 assert.equal((await call('/catalog/suppliers/legacy-accounts?search=tailong')).body.total,1);
 assert.equal((await call('/catalog/suppliers/legacy-accounts?search='+encodeURIComponent('泰龙'))).body.total,3);
 assert.equal((await call('/catalog/suppliers/legacy-accounts?search=does-not-exist')).body.items.length,0);
 assert.equal((await call('/catalog/suppliers/legacy-accounts/not-an-id')).status,400);
 assert.equal((await call('/catalog/suppliers/legacy-accounts',null)).status,401);
 assert.equal((await call('/catalog/suppliers/legacy-accounts',{id:'ffffffff-ffff-4fff-8fff-ffffffffffff'})).status,403);
 const suppliers=await call('/catalog/suppliers?page=1&pageSize=20');
 assert.equal(suppliers.status,200); assert.equal(suppliers.body.total,88); assert.equal(suppliers.body.items.length,20);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM identity.users')).rows[0].n,before);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM catalog.suppliers WHERE user_id IS NOT NULL')).rows[0].n,0);
 console.log('PASS: accounts, independent grants, searches, validation, 401/403, supplier pagination, no automatic login accounts');
} finally { await pool.end(); }
