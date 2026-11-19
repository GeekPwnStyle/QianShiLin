const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status,message)=>Object.assign(new Error(message),{status});
export async function handlePricing({req,res,url,user,pool,send,readJson,clientIp}){
 const match=/^\/pricing\/(categories|items)(?:\/([0-9a-f-]+|batch-delete|unlock))?$/.exec(url.pathname);
 if(!match)return false;
 if(!user){send(res,401,{error:'请重新登录'});return true;}
 const {rows:[actor]}=await pool.query(`SELECT a.store_ids,a.permission_denies,r.permissions,r.identity_type,r.sensitive_fields FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id]);
 const has=code=>actor?.permissions.includes(code)&&!actor.permission_denies.includes(code);
 const resource=match[1],id=match[2],table=resource==='categories'?'pricing.categories':'pricing.items';
 const seeCost=actor?.identity_type==='admin'||actor?.sensitive_fields?.viewCostPrice===true;
 if(!actor||actor.identity_type==='supplier'||!has('basic.fee.read')){send(res,403,{error:'没有服务定价访问权限'});return true;}
 const shape=row=>{if(resource==='items'&&!seeCost){const {cost_price,...safe}=row;return {...safe,cost_price:null};}return row;};
 try{
 if(req.method==='GET'&&!id){
  const store=url.searchParams.get('storeId')||'';
  if(store&&!actor.store_ids.includes(store))throw fail(403,'门店超出授权范围');
  const scopes=store?[store]:actor.store_ids;
  const page=Math.max(1,Math.min(10000,parseInt(url.searchParams.get('page')||'1')||1));
  const pageSize=Math.max(1,Math.min(100,parseInt(url.searchParams.get('pageSize')||'20')||20));
  const keyword=(url.searchParams.get('search')||'').trim().slice(0,120);
  const category=url.searchParams.get('categoryId')||null;if(category&&!uuid.test(category))throw fail(400,'类别无效');
  const enabled=url.searchParams.get('enabled');if(enabled&&!['true','false'].includes(enabled))throw fail(400,'状态无效');
  const vals=[scopes,keyword?`%${keyword.replace(/[\\%_]/g,'\\$&')}%`:null];
  let where=`WHERE t.store_id=ANY($1::text[]) AND ($2::text IS NULL OR t.name ILIKE $2 ESCAPE '\\')`;
  if(resource==='items'){vals.push(category,enabled==='true'?true:enabled==='false'?false:null);where+=' AND ($3::uuid IS NULL OR t.category_id=$3) AND ($4::boolean IS NULL OR t.enabled=$4)';}
  const {rows:[count]}=await pool.query(`SELECT count(*)::int total FROM ${table} t ${where}`,vals);
  const fields=resource==='categories'?`t.*,(SELECT count(*)::int FROM pricing.items i WHERE i.category_id=t.id) item_count`:`t.*,c.name category_name`;
  const join=resource==='items'?'JOIN pricing.categories c ON c.id=t.category_id':'';
  const {rows}=await pool.query(`SELECT ${fields} FROM ${table} t ${join} ${where} ORDER BY t.sort_order,t.created_at,t.id LIMIT $${vals.length+1} OFFSET $${vals.length+2}`,[...vals,pageSize,(page-1)*pageSize]);
  send(res,200,{items:rows.map(shape),total:count.total,page,pageSize});return true;
 }
 const operation=req.method==='POST'&&!id?'create':req.method==='DELETE'||id==='batch-delete'?'delete':'update';
 if(!has('basic.fee.'+operation))throw fail(403,'没有对应操作权限');
 const body=await readJson(req);
 if(id==='batch-delete'&&req.method!=='POST'||id==='unlock'&&req.method!=='POST')throw fail(405,'Method not allowed');
 if(id&&!['batch-delete','unlock'].includes(id)&&!uuid.test(id))throw fail(400,'记录标识无效');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');let result,action;
  if(req.method==='DELETE'||id==='batch-delete'){
   const ids=id==='batch-delete'?body.ids:[id];if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(x=>!uuid.test(x)))throw fail(400,'请选择最多100条有效记录');
   const unique=[...new Set(ids)];const {rows}=await client.query(`SELECT * FROM ${table} WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`,[unique]);
   if(rows.length!==unique.length||rows.some(x=>!actor.store_ids.includes(x.store_id)))throw fail(403,'记录不存在或超出门店范围');
   if(resource==='categories'&&rows.some(x=>x.read_only))throw fail(409,'所选类别含只读记录，请先解除只读');
   await client.query(`DELETE FROM ${table} WHERE id=ANY($1::uuid[])`,[unique]);result={deletedCount:rows.length};action='删除';
  }else if(id==='unlock'){
   if(resource!=='categories'||actor.identity_type!=='admin'||!uuid.test(body.id))throw fail(403,'仅管理员可解除类别只读');
   if(!Number.isInteger(body.version)||body.version<1)throw fail(400,'Invalid version');
   const {rows}=await client.query(`UPDATE pricing.categories SET read_only=false,version=version+1,updated_at=now() WHERE id=$1 AND store_id=ANY($2::text[]) AND version=$3 RETURNING *`,[body.id,actor.store_ids,body.version]);
   if(!rows.length)throw fail(409,'记录已变化或超出权限，请刷新');result=rows[0];action='解除只读';
  }else{
   if(!['POST','PATCH'].includes(req.method)||req.method==='PATCH'&&!id||req.method==='POST'&&id)throw fail(405,'Method not allowed');
   const name=typeof body.name==='string'?body.name.trim():'';const store=body.store_id;
   if(!name||name.length>(resource==='categories'?120:180)||!actor.store_ids.includes(store)||!Number.isInteger(body.sort_order)||body.sort_order<0||body.sort_order>999999)throw fail(400,'请检查名称、排序和授权门店');
   let before;
   if(id){const {rows}=await client.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,[id]);before=rows[0];if(!before||!actor.store_ids.includes(before.store_id))throw fail(403,'记录不存在或超出门店范围');if(before.store_id!==store)throw fail(400,'不能直接变更所属门店');if(body.version!==before.version)throw fail(409,'记录已被他人修改，请刷新后重试');if(resource==='categories'&&before.read_only)throw fail(409,'只读类别请先由管理员解除只读');}
   let cols=['name','store_id','sort_order'],values=[name,store,body.sort_order];
   if(resource==='categories'){
    if(typeof body.read_only!=='boolean')throw fail(400,'请选择只读状态');
    cols.push('read_only');values.push(body.read_only);
   }else{
    const money=x=>(typeof x==='string'||typeof x==='number')&&/^\d{1,10}(\.\d{1,2})?$/.test(String(x));
    if(!uuid.test(body.category_id)||typeof body.enabled!=='boolean'||!money(body.retail_price)||!money(body.cost_price))throw fail(400,'请检查类别、金额（最多两位小数）和启用状态');
    if(!seeCost)throw fail(403,'没有成本价格维护权限');
    cols.push('category_id','cost_price','retail_price','enabled');values.push(body.category_id,body.cost_price,body.retail_price,body.enabled);
   }
   const sql=id?`UPDATE ${table} SET ${cols.map((c,i)=>c+'=$'+(i+1)).join(',')},version=version+1,updated_at=now() WHERE id=$${values.length+1} RETURNING *`:`INSERT INTO ${table} (${cols.join(',')}) VALUES (${values.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`;
   if(id)values.push(id);result=(await client.query(sql,values)).rows[0];action=id?'编辑':'新增';
  }
  await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,target,details,ip_address) VALUES($1,$2,$3,'服务定价',$4,$5,$6::jsonb,$7)`,[user.id,user.role_id,user.role_name,action,id||result.id,JSON.stringify({resource,name:result.name,deletedCount:result.deletedCount}),clientIp(req)]);
  await client.query('COMMIT');send(res,req.method==='POST'&&!id?201:200,shape(result));return true;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){if(e.status){send(res,e.status,{error:e.message});return true;}if(e.code==='23505'){send(res,409,{error:'同一门店及类别下名称重复'});return true;}if(e.code==='23503'){send(res,409,{error:'类别仍有服务项目引用，或所选类别不属于该门店'});return true;}throw e;}
}
