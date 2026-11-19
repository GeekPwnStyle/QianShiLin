export const storeIds=[];
export const storeNames={};
export const storeSet=new Set();
let refreshed=0,pending;
export async function refreshStoreRegistry(pool,force=false){
 if(!force&&Date.now()-refreshed<5000)return;
 if(pending)return pending;
 pending=(async()=>{const {rows}=await pool.query('SELECT id,profile FROM organization.stores ORDER BY (profile->>\'numericId\')::int,id');storeIds.splice(0,storeIds.length,...rows.map(r=>r.id));storeSet.clear();storeIds.forEach(id=>storeSet.add(id));Object.keys(storeNames).forEach(k=>delete storeNames[k]);rows.forEach(r=>storeNames[r.id]=r.profile.name);refreshed=Date.now();})().finally(()=>pending=null);return pending;
}
export async function handleStores({req,res,user,pool,send,readJson}){
 if(!user){send(res,401,{error:'请重新登录'});return;}
 const {rows:[actor]}=await pool.query(`SELECT r.identity_type,r.permissions,a.permission_denies,a.store_ids FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id]);
 const manage=actor?.identity_type==='admin'&&actor.permissions.includes('system.store.manage')&&!actor.permission_denies.includes('system.store.manage');
 if(req.method==='GET'){
  const client=await pool.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const {rows}=await client.query('SELECT profile FROM organization.stores WHERE $1::boolean OR id=ANY($2::text[]) ORDER BY (profile->>\'numericId\')::int,id',[manage,actor?.store_ids||[]]);const {rows:[v]}=await client.query('SELECT revision FROM organization.store_revision');await client.query('COMMIT');send(res,200,{items:rows.map(r=>r.profile),revision:v.revision});}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}return;
 }
 if(req.method!=='PUT'){send(res,405,{error:'Method not allowed'});return;}
 if(!manage){send(res,403,{error:'仅门店管理员可修改'});return;}
 const body=await readJson(req,2*1024*1024);
 if(!body||!Array.isArray(body.items)||body.items.length>500||!Number.isInteger(body.revision)){send(res,400,{error:'门店资料格式不正确'});return;}
 const records=body.items,ids=new Set(),codes=new Set();
 for(const r of records){if(!r||typeof r.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>120||typeof r.storeCode!=='string'||!r.storeCode.trim()||r.storeCode.length>40||!Number.isInteger(r.numericId)||!r.permissions||!r.config||ids.has(r.id)||codes.has(r.storeCode.trim().toLowerCase())){send(res,400,{error:'名称、编码、序号必填且编码不能重复'});return;}ids.add(r.id);codes.add(r.storeCode.trim().toLowerCase());r.name=r.name.trim();r.storeCode=r.storeCode.trim();}
 const client=await pool.connect();try{
  await client.query('BEGIN');const {rows:[v]}=await client.query('SELECT revision FROM organization.store_revision FOR UPDATE');if(v.revision!==body.revision){await client.query('ROLLBACK');send(res,409,{error:'门店资料已被修改，请刷新后重试'});return;}
  const {rows:removed}=await client.query('SELECT id FROM organization.stores WHERE NOT(id=ANY($1::text[]))',[[...ids]]);
  for(const r of removed){for(const table of ['customer.profiles','staff.profiles','purchase.orders','purchase.manual_inbound_drafts','catalog.products','catalog.warehouses','pricing.categories','pricing.items']){const check=await client.query(`SELECT 1 FROM ${table} WHERE store_id::text=$1 LIMIT 1`,[r.id]);if(check.rowCount){await client.query('ROLLBACK');send(res,409,{error:'所删门店仍有业务资料，不能删除'});return;}}}
  await client.query('DELETE FROM organization.stores WHERE NOT(id=ANY($1::text[]))',[[...ids]]);
  for(const r of records)await client.query('INSERT INTO organization.stores(id,code,profile) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,profile=EXCLUDED.profile',[r.id,r.storeCode,JSON.stringify(r)]);
  await client.query(`UPDATE identity.user_access a SET store_ids=CASE WHEN r.identity_type='admin' THEN $1::text[] ELSE ARRAY(SELECT unnest(a.store_ids) INTERSECT SELECT unnest($1::text[])) END FROM identity.roles r WHERE r.id=a.role_id`,[[...ids]]);
  const {rows:[next]}=await client.query('UPDATE organization.store_revision SET revision=revision+1 RETURNING revision');
  await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,details) VALUES($1,$2,$3,'门店资料','保存门店资料',$4::jsonb)`,[user.id,user.role_id,user.role_name,JSON.stringify({count:records.length})]);
  await client.query('COMMIT');await refreshStoreRegistry(pool,true);send(res,200,{items:records,revision:next.revision});
 }catch(e){await client.query('ROLLBACK');if(e.code==='23505'){send(res,409,{error:'门店编码重复'});return;}throw e;}finally{client.release();}
}
