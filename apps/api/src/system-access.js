const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roleId = /^role_[a-z0-9_]{1,80}$/;
const permission = /^[a-z][a-z0-9_.]{1,100}$/;
const stores = new Set(['store_hq_01','store_hz_02','store_sh_03','store_nj_04']);
const sensitiveKeys = ['viewCostPrice','viewWholesalePrice','viewProfitMargin','viewPlaintextPhone','batchExport'];
const shapeRole = row => ({ id: row.id, name: row.name, identityType: row.identity_type,
  subRole: row.sub_role ?? undefined, description: row.description, dataScope: row.data_scope,
  permissions: row.permissions, sensitiveFields: row.sensitive_fields,
  updatedAt: row.updated_at, updatedBy: row.updated_by });
const shapeAudit = row => ({ id: row.id, roleId: row.target_kind === 'role' ? row.target_id : '',
  roleName: row.target_kind === 'role' ? row.target_id : '', operator: row.actor_name,
  actionSummary: `${row.target_kind === 'role' ? '角色权限' : '用户权限'}已更新：${row.target_id}`,
  changedPermissions: [], createdAt: row.created_at });
const validCodes = value => Array.isArray(value) && value.length <= 300 && value.every(code => typeof code === 'string' && permission.test(code)) && new Set(value).size === value.length;
const validStores = value => Array.isArray(value) && value.length <= stores.size && value.every(id => stores.has(id)) && new Set(value).size === value.length;

export async function handleSystemAccess({ req, res, url, user, pool, send, readJson }) {
  const path = url.pathname;
  if (!path.startsWith('/system/')) return false;
  if (!user) { send(res,401,{ error: 'Unauthorized' }); return true; }
  const { rows: actors } = await pool.query(`SELECT a.role_id,r.identity_type,r.permissions,a.permission_denies
    FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id]);
  const actor = actors[0];
  const canRole = actor?.identity_type === 'admin' && actor.permissions.includes('system.role.manage') && !actor.permission_denies.includes('system.role.manage');
  const canUser = actor?.identity_type === 'admin' && actor.permissions.includes('system.user.manage') && !actor.permission_denies.includes('system.user.manage');
  if (!actor) { send(res,403,{ error: 'Forbidden' }); return true; }

  if (path === '/system/operation-logs' && req.method === 'GET') {
    if (actor.identity_type !== 'admin' || !actor.permissions.includes('system.read') || actor.permission_denies.includes('system.read')) {
      send(res,403,{ error: 'Forbidden' }); return true;
    }
    const page = Math.min(10000,Math.max(1,Number.parseInt(url.searchParams.get('page') ?? '1',10) || 1));
    const pageSize = Math.min(100,Math.max(1,Number.parseInt(url.searchParams.get('pageSize') ?? '20',10) || 20));
    const search = (url.searchParams.get('search') ?? '').trim().slice(0,120);
    const month = url.searchParams.get('month') ?? '';
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { send(res,400,{error:'Invalid month'}); return true; }
    const values=[month ? `${month}-01` : null,search ? `%${search.replace(/[\\%_]/g,'\\$&')}%` : null];
    const where=`WHERE ($1::date IS NULL OR (l.created_at >= $1::date AND l.created_at < $1::date + interval '1 month'))
      AND ($2::text IS NULL OR u.display_name ILIKE $2 ESCAPE '\\' OR l.category ILIKE $2 ESCAPE '\\' OR l.action ILIKE $2 ESCAPE '\\')`;
    const count=await pool.query(`SELECT count(*)::int AS total FROM identity.operation_log l LEFT JOIN identity.users u ON u.id=l.actor_user_id ${where}`,values);
    const {rows}=await pool.query(`SELECT l.id,l.category,l.action,l.target,l.details,l.ip_address,l.client_type,l.created_at,l.actor_role_id,l.actor_role_name,
      u.display_name AS actor_name FROM identity.operation_log l LEFT JOIN identity.users u ON u.id=l.actor_user_id ${where}
      ORDER BY l.created_at DESC,l.id DESC LIMIT $3 OFFSET $4`,[...values,pageSize,(page-1)*pageSize]);
    send(res,200,{items:rows,total:count.rows[0].total,page,pageSize}); return true;
  }

  if (path === '/system/roles' && req.method === 'GET') {
    const { rows } = await pool.query(canRole || canUser
      ? 'SELECT * FROM identity.roles ORDER BY id'
      : 'SELECT * FROM identity.roles WHERE id=$1',canRole || canUser ? [] : [actor.role_id]);
    send(res,200,rows.map(shapeRole)); return true;
  }
  if (path === '/system/audit' && req.method === 'GET') {
    if (!canRole && !canUser) { send(res,403,{ error: 'Forbidden' }); return true; }
    const { rows } = await pool.query(`SELECT a.*,u.display_name AS actor_name FROM identity.access_audit a
      JOIN identity.users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 100`);
    send(res,200,rows.map(shapeAudit)); return true;
  }
  if (path === '/system/users' && req.method === 'GET') {
    if (!canUser) { send(res,403,{ error: 'Forbidden' }); return true; }
    const { rows } = await pool.query(`SELECT u.id,u.username,u.display_name,u.status,a.role_id,a.store_ids,a.permission_denies,
      a.updated_at,r.name AS role_name,r.identity_type,r.permissions
      FROM identity.users u JOIN identity.user_access a ON a.user_id=u.id JOIN identity.roles r ON r.id=a.role_id
      ORDER BY u.username`);
    send(res,200,rows); return true;
  }
  const roleMatch = /^\/system\/roles\/([^/]+)$/.exec(path);
  if (roleMatch && req.method === 'PUT') {
    if (!canRole) { send(res,403,{ error: 'Forbidden' }); return true; }
    const id = roleMatch[1];
    if (!roleId.test(id)) { send(res,400,{ error: 'Invalid role' }); return true; }
    let body;
    try { body=await readJson(req); } catch { send(res,400,{ error: 'Invalid JSON' }); return true; }
    const perms=body?.permissions, fields=body?.sensitiveFields;
    if (!validCodes(perms) || !fields || sensitiveKeys.some(key => typeof fields[key] !== 'boolean')
      || !['all_stores','assigned_stores','own_supplier'].includes(body?.dataScope)) {
      send(res,400,{ error: 'Invalid role data' }); return true;
    }
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: before } = await client.query('SELECT * FROM identity.roles WHERE id=$1 FOR UPDATE',[id]);
      if (!before.length) { await client.query('ROLLBACK'); send(res,404,{ error: 'Not found' }); return true; }
      const role=before[0];
      if ((role.identity_type === 'admin' && (body.dataScope !== 'all_stores' || !['system.read','system.role.manage','system.user.manage'].every(code => perms.includes(code))))
        || (role.identity_type === 'store' && body.dataScope !== 'assigned_stores')
        || (role.identity_type === 'supplier' && body.dataScope !== 'own_supplier')) {
        await client.query('ROLLBACK'); send(res,400,{ error: 'Role scope or administrator baseline is protected' }); return true;
      }
      const { rows: updated } = await client.query(`UPDATE identity.roles SET data_scope=$2,permissions=$3,sensitive_fields=$4,
        updated_at=now(),updated_by=$5 WHERE id=$1 RETURNING *`,[id,body.dataScope,perms,JSON.stringify(fields),user.display_name]);
      await client.query(`INSERT INTO identity.access_audit(actor_user_id,target_kind,target_id,before_state,after_state)
        VALUES($1,'role',$2,to_jsonb($3::json),to_jsonb($4::json))`,
        [user.id,id,JSON.stringify(role),JSON.stringify(updated[0])]);
      await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,target,details)
        SELECT $1,a.role_id,r.name,'权限管理','更新角色权限',$2,$3::jsonb FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`, [user.id,id,JSON.stringify({role:role.name})]);
      await client.query('COMMIT'); send(res,200,shapeRole(updated[0])); return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  const userMatch = /^\/system\/users\/([^/]+)$/.exec(path);
  if (userMatch && req.method === 'PUT') {
    if (!canUser) { send(res,403,{ error: 'Forbidden' }); return true; }
    const id=userMatch[1];
    if (!uuid.test(id)) { send(res,400,{ error: 'Invalid user' }); return true; }
    let body;
    try { body=await readJson(req); } catch { send(res,400,{ error: 'Invalid JSON' }); return true; }
    if (!roleId.test(body?.roleId ?? '') || !validStores(body?.storeIds) || !validCodes(body?.permissionDenies)) {
      send(res,400,{ error: 'Invalid assignment' }); return true;
    }
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: current }=await client.query(`SELECT a.*,u.username,old_role.identity_type AS current_identity_type FROM identity.user_access a JOIN identity.users u ON u.id=a.user_id
        JOIN identity.roles old_role ON old_role.id=a.role_id
        WHERE a.user_id=$1 FOR UPDATE`,[id]);
      const { rows: roles }=await client.query('SELECT * FROM identity.roles WHERE id=$1',[body.roleId]);
      if (!current.length || !roles.length) { await client.query('ROLLBACK'); send(res,404,{ error: 'Not found' }); return true; }
      const target=current[0], role=roles[0];
      if (target.username === 'admin' && (body.roleId !== 'role_hq_admin' || body.permissionDenies.length || body.storeIds.length !== stores.size)) {
        await client.query('ROLLBACK'); send(res,400,{ error: 'Administrator baseline is protected' }); return true;
      }
      if (id === user.id && (body.roleId !== target.role_id || body.permissionDenies.length > target.permission_denies.length)) {
        await client.query('ROLLBACK'); send(res,400,{ error: 'Cannot change own access' }); return true;
      }
      if (role.identity_type === 'supplier' ? body.storeIds.length !== 0 : body.storeIds.length === 0) {
        await client.query('ROLLBACK'); send(res,400,{ error: 'Store scope is required for staff and forbidden for supplier' }); return true;
      }
      if (!body.permissionDenies.every(code => role.permissions.includes(code))) {
        await client.query('ROLLBACK'); send(res,400,{ error: 'Individual permissions may only restrict the role' }); return true;
      }
      if (target.current_identity_type !== role.identity_type) {
        await client.query('ROLLBACK'); send(res,400,{ error: 'Identity type mismatch' }); return true;
      }
      const { rows: updated }=await client.query(`UPDATE identity.user_access SET role_id=$2,store_ids=$3,permission_denies=$4,
        updated_at=now(),updated_by=$5 WHERE user_id=$1 RETURNING *`,[id,body.roleId,body.storeIds,body.permissionDenies,user.id]);
      await client.query(`INSERT INTO identity.access_audit(actor_user_id,target_kind,target_id,before_state,after_state)
        VALUES($1,'user',$2,to_jsonb($3::json),to_jsonb($4::json))`,
        [user.id,id,JSON.stringify(target),JSON.stringify(updated[0])]);
      await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,target,details)
        SELECT $1,a.role_id,r.name,'权限管理','更新用户权限',$2,$3::jsonb FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id,id,JSON.stringify({username:target.username})]);
      await client.query('COMMIT'); send(res,200,{ id,role_id:updated[0].role_id,store_ids:updated[0].store_ids,permission_denies:updated[0].permission_denies }); return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  send(res,404,{ error: 'Not found' }); return true;
}
