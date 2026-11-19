import { storeSet as stores } from './stores.js';
import { resolveIpRegion } from './ip-region.js';
import { ensureAccountSchema } from './account.js';
import { ensureSupplierSchema } from './catalog.js';

import { randomUUID } from 'node:crypto';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roleId = /^role_[a-z0-9_]{1,80}$/;
const permission = /^[a-z][a-z0-9_.]{1,100}$/;

const sensitiveKeys = ['viewCostPrice','viewWholesalePrice','viewProfitMargin','viewPlaintextPhone','batchExport'];
const shapeRole = row => ({ id: row.id, name: row.name, identityType: row.identity_type,
  subRole: row.sub_role ?? undefined, description: row.description, dataScope: row.data_scope,
  permissions: row.permissions, sensitiveFields: row.sensitive_fields,
  updatedAt: row.updated_at, updatedBy: row.updated_by });
const shapeAudit = row => ({ id: row.id, roleId: row.target_kind === 'role' ? row.target_id : '',
  roleName: row.target_kind === 'role' ? (row.after_state?.name ?? row.before_state?.name ?? row.target_id) : '', operator: row.actor_name,
  actionSummary: `${row.target_kind === 'role' ? '角色权限' : '用户权限'}${!row.before_state ? '已创建' : row.after_state && !Object.keys(row.after_state).length ? '已删除' : '已更新'}：${row.target_id}`,
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

  if (path === '/system/operation-logs/facets' && req.method === 'GET') {
    if (actor.identity_type !== 'admin' || !actor.permissions.includes('system.read') || actor.permission_denies.includes('system.read')) {
      send(res,403,{ error: 'Forbidden' }); return true;
    }
    const [rolesRes, logRolesRes, categoriesRes, actionsRes, clientsRes] = await Promise.all([
      pool.query(`SELECT id, name FROM identity.roles ORDER BY id`),
      pool.query(`SELECT DISTINCT actor_role_id, actor_role_name FROM identity.operation_log WHERE COALESCE(actor_role_name, '') <> ''`),
      pool.query(`SELECT DISTINCT category FROM identity.operation_log WHERE COALESCE(category, '') <> '' ORDER BY category`),
      pool.query(`SELECT DISTINCT category, action FROM identity.operation_log WHERE COALESCE(action, '') <> '' ORDER BY category, action`),
      pool.query(`SELECT DISTINCT client_type FROM identity.operation_log WHERE COALESCE(client_type, '') <> '' ORDER BY client_type`),
    ]);
    const roleMap = new Map();
    for (const r of rolesRes.rows) {
      roleMap.set(r.id, { id: r.id, name: r.name });
    }
    for (const r of logRolesRes.rows) {
      const key = r.actor_role_id || r.actor_role_name;
      if (key && !roleMap.has(key) && !Array.from(roleMap.values()).some(item => item.name === r.actor_role_name)) {
        roleMap.set(key, { id: key, name: r.actor_role_name });
      }
    }
    send(res,200,{
      roles: Array.from(roleMap.values()),
      categories: categoriesRes.rows.map(r => r.category),
      actions: actionsRes.rows.map(r => ({ category: r.category, action: r.action })),
      clientTypes: clientsRes.rows.map(r => r.client_type),
    });
    return true;
  }

  if (path === '/system/operation-logs' && req.method === 'GET') {
    if (actor.identity_type !== 'admin' || !actor.permissions.includes('system.read') || actor.permission_denies.includes('system.read')) {
      send(res,403,{ error: 'Forbidden' }); return true;
    }
    const page = Math.min(10000,Math.max(1,Number.parseInt(url.searchParams.get('page') ?? '1',10) || 1));
    const pageSize = Math.min(100,Math.max(1,Number.parseInt(url.searchParams.get('pageSize') ?? '20',10) || 20));
    const search = (url.searchParams.get('search') ?? '').trim().slice(0,120);
    const month = (url.searchParams.get('month') ?? '').trim();
    const startDate = (url.searchParams.get('startDate') ?? '').trim();
    const endDate = (url.searchParams.get('endDate') ?? '').trim();
    const roleFilter = (url.searchParams.get('role') ?? url.searchParams.get('roleId') ?? '').trim().slice(0,120);
    const category = (url.searchParams.get('category') ?? '').trim().slice(0,80);
    const action = (url.searchParams.get('action') ?? '').trim().slice(0,120);
    const clientType = (url.searchParams.get('clientType') ?? '').trim().slice(0,80);

    const dateOrDatetimeRe = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { send(res,400,{error:'Invalid month'}); return true; }
    if (startDate && !dateOrDatetimeRe.test(startDate)) { send(res,400,{error:'Invalid startDate'}); return true; }
    if (endDate && !dateOrDatetimeRe.test(endDate)) { send(res,400,{error:'Invalid endDate'}); return true; }

    const clauses = [];
    const values = [];
    if (month && !startDate && !endDate) {
      values.push(`${month}-01`);
      clauses.push(`l.created_at >= ($${values.length}::date::timestamp AT TIME ZONE 'Asia/Shanghai') AND l.created_at < (($${values.length}::date + interval '1 month')::timestamp AT TIME ZONE 'Asia/Shanghai')`);
    }
    if (startDate) {
      const normalized = startDate.length === 10 ? `${startDate} 00:00:00` : startDate.replace('T', ' ');
      values.push(normalized);
      clauses.push(`l.created_at >= ($${values.length}::timestamp AT TIME ZONE 'Asia/Shanghai')`);
    }
    if (endDate) {
      if (endDate.length === 10) {
        values.push(endDate);
        clauses.push(`l.created_at < (($${values.length}::date + interval '1 day')::timestamp AT TIME ZONE 'Asia/Shanghai')`);
      } else {
        const normalized = endDate.replace('T', ' ');
        values.push(normalized);
        clauses.push(`l.created_at <= ($${values.length}::timestamp AT TIME ZONE 'Asia/Shanghai')`);
      }
    }
    if (roleFilter) {
      values.push(roleFilter);
      clauses.push(`(l.actor_role_id = $${values.length} OR l.actor_role_name = $${values.length})`);
    }
    if (category) {
      values.push(category);
      clauses.push(`l.category = $${values.length}`);
    }
    if (action) {
      values.push(action);
      clauses.push(`l.action = $${values.length}`);
    }
    if (clientType) {
      values.push(clientType);
      clauses.push(`l.client_type = $${values.length}`);
    }
    if (search) {
      values.push(`%${search.replace(/[\\%_]/g,'\\$&')}%`);
      const p = `$${values.length}`;
      clauses.push(`(u.display_name ILIKE ${p} ESCAPE '\\' OR u.username ILIKE ${p} ESCAPE '\\' OR l.category ILIKE ${p} ESCAPE '\\' OR l.action ILIKE ${p} ESCAPE '\\' OR COALESCE(l.actor_role_name,'') ILIKE ${p} ESCAPE '\\' OR COALESCE(l.target,'') ILIKE ${p} ESCAPE '\\' OR COALESCE(l.ip_address::text,'') ILIKE ${p} ESCAPE '\\' OR l.details::text ILIKE ${p} ESCAPE '\\')`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const fromClause = `FROM identity.operation_log l LEFT JOIN identity.users u ON u.id=l.actor_user_id`;
    const count = await pool.query(`SELECT count(*)::int AS total ${fromClause} ${where}`, values);
    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    const { rows } = await pool.query(
      `SELECT l.id,l.category,l.action,l.target,l.details,l.ip_address,l.client_type,l.created_at,l.actor_role_id,l.actor_role_name,
        u.display_name AS actor_name, u.username AS actor_username ${fromClause} ${where}
       ORDER BY l.created_at DESC,l.id DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...values, pageSize, (page - 1) * pageSize]
    );
    const regions = new Map();
    const items = await Promise.all(rows.map(async row => {
      if (!regions.has(row.ip_address)) regions.set(row.ip_address, resolveIpRegion(row.ip_address));
      return { ...row, ip_region: await regions.get(row.ip_address) };
    }));
    send(res,200,{items,total:count.rows[0].total,page,pageSize}); return true;
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
    await Promise.all([ensureAccountSchema(pool), ensureSupplierSchema(pool)]);
    const { rows } = await pool.query(`SELECT u.id,u.username,u.display_name,u.email,u.status,a.role_id,a.store_ids,a.permission_denies,
      a.updated_at,r.name AS role_name,r.identity_type,r.permissions,
      COALESCE(NULLIF(up.title,''), r.name, '系统成员') AS title,
      COALESCE(up.theme_key, 'lime_charcoal') AS theme_key,
      COALESCE(up.avatar_color_preset, 'charcoal') AS avatar_color_preset,
      uca.supplier_id, sup.name AS supplier_name
      FROM identity.users u
      JOIN identity.user_access a ON a.user_id=u.id
      JOIN identity.roles r ON r.id=a.role_id
      LEFT JOIN identity.user_profiles up ON up.user_id=u.id
      LEFT JOIN identity.user_catalog_access uca ON uca.user_id=u.id
      LEFT JOIN catalog.suppliers sup ON sup.id=uca.supplier_id
      ORDER BY CASE r.identity_type WHEN 'admin' THEN 0 WHEN 'store' THEN 1 ELSE 2 END, u.username`);
    send(res,200,rows); return true;
  }
  if (path === '/system/roles' && req.method === 'POST') {
    if (!canRole) { send(res,403,{ error: 'Forbidden' }); return true; }
    let body;
    try { body=await readJson(req); } catch { send(res,400,{ error: 'Invalid JSON' }); return true; }
    const name=typeof body?.name === 'string' ? body.name.trim() : '';
    const identityType=body?.identityType;
    const requiredScope=identityType === 'store' ? 'assigned_stores' : identityType === 'supplier' ? 'own_supplier' : null;
    if (!requiredScope || !name || name.length > 60 || !validCodes(body?.permissions) || body.permissions.length > 100
      || body.permissions.some(code => !actor.permissions.includes(code) || actor.permission_denies.includes(code)) || !body.permissions.includes(identityType === 'store' ? 'workbench.read' : 'brands.read')) {
      send(res,400,{ error: 'Invalid role definition' }); return true;
    }
    const id=`role_custom_${randomUUID().replace(/-/g,'')}`;
    const fields=Object.fromEntries(sensitiveKeys.map(key => [key,false]));
    const client=await pool.connect();
    try { await client.query('BEGIN');
      const {rows}=await client.query(`INSERT INTO identity.roles(id,name,identity_type,description,data_scope,permissions,sensitive_fields,updated_by)
        VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING *`,[id,name,identityType,body.description?.slice?.(0,300) ?? '',requiredScope,body.permissions,JSON.stringify(fields),user.display_name]);
      await client.query(`INSERT INTO identity.access_audit(actor_user_id,target_kind,target_id,after_state) VALUES($1,'role',$2,to_jsonb($3::json))`,[user.id,id,JSON.stringify(rows[0])]);
      await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,target,details)
        SELECT $1,a.role_id,r.name,'权限管理','新增角色',$2,$3::jsonb FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id,id,JSON.stringify({role:name})]);
      await client.query('COMMIT'); send(res,201,shapeRole(rows[0])); return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  const roleMatch = /^\/system\/roles\/([^/]+)$/.exec(path);
  if (roleMatch && req.method === 'DELETE') {
    if (!canRole) { send(res,403,{ error: 'Forbidden' }); return true; }
    const id=roleMatch[1];
    if (!/^role_custom_[0-9a-f]{32}$/.test(id)) { send(res,400,{ error: 'Only custom roles can be deleted' }); return true; }
    const client=await pool.connect();
    try { await client.query('BEGIN');
      const assigned=await client.query('SELECT count(*)::int AS total FROM identity.user_access WHERE role_id=$1',[id]);
      if (assigned.rows[0].total) { await client.query('ROLLBACK'); send(res,409,{ error: 'Role is assigned to users' }); return true; }
      const {rows}=await client.query('DELETE FROM identity.roles WHERE id=$1 RETURNING *',[id]);
      if (!rows.length) { await client.query('ROLLBACK'); send(res,404,{ error: 'Not found' }); return true; }
      await client.query(`INSERT INTO identity.access_audit(actor_user_id,target_kind,target_id,before_state,after_state) VALUES($1,'role',$2,to_jsonb($3::json),'{}'::jsonb)`,[user.id,id,JSON.stringify(rows[0])]);
      await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,target,details)
        SELECT $1,a.role_id,r.name,'权限管理','删除角色',$2,$3::jsonb FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id,id,JSON.stringify({role:rows[0].name})]);
      await client.query('COMMIT'); send(res,200,{deleted:id}); return true;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
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
      const { rows: current }=await client.query(`SELECT a.*,u.username,u.is_system_admin,old_role.identity_type AS current_identity_type FROM identity.user_access a JOIN identity.users u ON u.id=a.user_id
        JOIN identity.roles old_role ON old_role.id=a.role_id
        WHERE a.user_id=$1 FOR UPDATE`,[id]);
      const { rows: roles }=await client.query('SELECT * FROM identity.roles WHERE id=$1',[body.roleId]);
      if (!current.length || !roles.length) { await client.query('ROLLBACK'); send(res,404,{ error: 'Not found' }); return true; }
      const target=current[0], role=roles[0];
      if (target.is_system_admin && (body.roleId !== 'role_hq_admin' || body.permissionDenies.length || body.storeIds.length !== stores.size)) {
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
      await client.query(
        `UPDATE staff.profiles
         SET data = jsonb_set(jsonb_set(data, '{role}', to_jsonb($2::text)), '{roleId}', to_jsonb($3::text))
         WHERE user_id = $1`,
        [id, role.name, role.id]
      );
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
