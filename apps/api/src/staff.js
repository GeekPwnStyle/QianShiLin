import { storeIds as ALL_STORE_IDS } from './stores.js';
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const usernameRe = /^[\p{L}\p{N}·._ -]{1,64}$/u;
const fields = ['name', 'role', 'department', 'limit', 'age', 'gender', 'education', 'phone', 'address', 'loginStatus', 'tags'];


let schemaReadyPromise = null;

export function ensureStaffSchema(pool) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS staff`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS staff.profiles (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          store_id text NOT NULL,
          source_id uuid,
          user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
          data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
          UNIQUE (store_id, source_id)
        )
      `);
      await pool.query(`ALTER TABLE staff.profiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS staff_profiles_store ON staff.profiles(store_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS staff_profiles_user_idx ON staff.profiles(user_id)`);
    })().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

async function syncIdentityUsersToStaff(pool) {
  const { rows: users } = await pool.query(`
    SELECT u.id, u.username, u.display_name, u.status,
           a.role_id, a.store_ids,
           r.name AS role_name, r.identity_type, r.sub_role
    FROM identity.users u
    JOIN identity.user_access a ON a.user_id = u.id
    JOIN identity.roles r ON r.id = a.role_id
    WHERE r.identity_type <> 'supplier'
    ORDER BY u.created_at ASC, u.username ASC
  `);

  if (!users.length) return;

  const { rows: profiles } = await pool.query(`SELECT id, store_id, user_id, data FROM staff.profiles`);
  const linkedUserIds = new Set(profiles.map((p) => p.user_id).filter(Boolean));
  const unlinkedByName = new Map();
  for (const p of profiles) {
    if (!p.user_id && p.data?.name) {
      const key = String(p.data.name).trim().toLowerCase();
      if (!unlinkedByName.has(key)) unlinkedByName.set(key, p);
    }
  }

  for (const u of users) {
    if (linkedUserIds.has(u.id)) continue;

    const existingByName = unlinkedByName.get(String(u.display_name || '').trim().toLowerCase());
    if (existingByName) {
      await pool.query(`UPDATE staff.profiles SET user_id = $1 WHERE id = $2`, [u.id, existingByName.id]);
      linkedUserIds.add(u.id);
      continue;
    }

    if (!Array.isArray(u.store_ids) || !u.store_ids.length) continue;
    const storeId = u.store_ids[0];
    const defaultDept = u.identity_type === 'admin' ? '总部运营' : '门店服务';
    const defaultLimit = u.identity_type === 'admin' ? '5000' : u.sub_role === 'store_manager' ? '1000' : '200';
    const profileData = {
      name: u.display_name,
      role: u.role_name,
      roleId: u.role_id,
      department: defaultDept,
      limit: defaultLimit,
      age: '',
      gender: '',
      education: '',
      phone: '',
      address: '',
      loginStatus: u.status === 'active' ? '正常' : '限制',
      tags: u.identity_type === 'admin' ? '核心管理' : '系统账号',
    };
    await pool.query(
      `INSERT INTO staff.profiles(store_id, user_id, data) VALUES ($1, $2, $3::jsonb)`,
      [storeId, u.id, JSON.stringify(profileData)]
    );
    linkedUserIds.add(u.id);
  }
}

export async function handleStaff({ req, res, url, user, pool, send, readJson }) {
  if (!user) return send(res, 401, { error: '请登录' });
  await ensureStaffSchema(pool);

  const { rows: [actor] } = await pool.query(
    `SELECT a.store_ids, a.permission_denies, r.permissions, r.identity_type
     FROM identity.user_access a
     JOIN identity.roles r ON r.id = a.role_id
     WHERE a.user_id = $1`,
    [user.id]
  );

  const has = (code) => actor?.permissions.includes(code) && !actor.permission_denies.includes(code);
  if (!has('basic.staff.read') || actor.identity_type === 'supplier') {
    return send(res, 403, { error: '无员工档案权限' });
  }

  const selectedStore=url.searchParams.get('storeId')==='all'?null:url.searchParams.get('storeId');
  if(selectedStore&&!actor.store_ids.includes(selectedStore))return send(res,403,{error:'门店超出授权范围'});
  const stores = req.method==='GET'&&selectedStore?[selectedStore]:(actor.store_ids??[]);
  const canEdit =
    has('basic.staff.update') ||
    (actor.identity_type === 'admin' && has('system.user.manage') && !actor.permission_denies.includes('basic.staff.update'));
  const canManageUsers = actor.identity_type === 'admin' && has('system.user.manage');

  if (req.method === 'GET') {
    if (process.env.QSL_ENABLE_DEMO_SEED === '1') await syncIdentityUsersToStaff(pool);

    const [{ rows }, { rows: roles }] = await Promise.all([
      pool.query(
        `SELECT p.id, p.store_id, p.user_id, p.data, p.created_at,
                u.username, u.display_name, u.status AS user_status,
                a.role_id AS live_role_id, a.store_ids AS user_store_ids,
                r.name AS live_role_name, r.identity_type AS live_identity_type
         FROM staff.profiles p
         LEFT JOIN identity.users u ON u.id = p.user_id
         LEFT JOIN identity.user_access a ON a.user_id = u.id
         LEFT JOIN identity.roles r ON r.id = a.role_id
         WHERE p.store_id = ANY($1::text[])
         ORDER BY COALESCE(u.display_name, p.data->>'name'), p.id`,
        [stores]
      ),
      pool.query(
        `SELECT id, name, identity_type, description
         FROM identity.roles
         WHERE identity_type <> 'supplier'
         ORDER BY CASE identity_type WHEN 'admin' THEN 0 ELSE 1 END, id ASC`
      ),
    ]);

    const shapedRows = rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      store_id: row.store_id,
      user_id: row.user_id ?? null,
      username: row.username ?? '',
      role_id: row.live_role_id ?? row.data?.roleId ?? '',
      user_store_ids: Array.isArray(row.user_store_ids) ? row.user_store_ids : null,
      data: {
        ...(row.data ?? {}),
        name: row.display_name || row.data?.name || '',
        role: row.live_role_name || row.data?.role || '',
        loginStatus: row.user_id
          ? (row.user_status === 'active' ? '正常' : '限制')
          : (row.data?.loginStatus || '正常'),
      },
    }));

    return send(res, 200, {
      rows: shapedRows,
      canEdit,
      canManageUsers,
      roles,
    });
  }

  if (!canEdit) return send(res, 403, { error: '无员工档案维护权限' });

  const body = await readJson(req, 16384);
  const action = url.searchParams.get('action');

  if (req.method === 'POST' && (action === 'delete' || action === 'sync')) {
    const ids = body?.ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || !ids.every((id) => typeof id === 'string' && uuidRe.test(id))) {
      return send(res, 400, { error: '请选择 1 至 100 条档案' });
    }
    if (action === 'delete') {
      const { rows: targets } = await pool.query(
        `SELECT p.id, p.user_id, u.is_system_admin, u.username
         FROM staff.profiles p
         LEFT JOIN identity.users u ON u.id = p.user_id
         WHERE p.id = ANY($1::uuid[]) AND p.store_id = ANY($2::text[])`,
        [ids, stores]
      );
      if (targets.some((t) => t.is_system_admin || t.user_id === user.id)) {
        return send(res, 400, { error: '不能删除当前登录账号或超级管理员关联的员工档案' });
      }
      const { rowCount } = await pool.query(
        `DELETE FROM staff.profiles WHERE id = ANY($1::uuid[]) AND store_id = ANY($2::text[])`,
        [ids, stores]
      );
      return send(res, 200, { count: rowCount });
    }

    if (!stores.includes(body.storeId)) return send(res, 403, { error: '目标门店不在授权范围' });
    const { rowCount } = await pool.query(
      `INSERT INTO staff.profiles(store_id, source_id, user_id, data)
       SELECT DISTINCT ON (COALESCE(source_id, id)) $3, COALESCE(source_id, id), user_id, data
       FROM staff.profiles
       WHERE id = ANY($1::uuid[]) AND store_id = ANY($2::text[]) AND store_id <> $3
         AND COALESCE(source_id, id) NOT IN (SELECT id FROM staff.profiles WHERE store_id = $3)
       ORDER BY COALESCE(source_id, id), id
       ON CONFLICT (store_id, source_id) DO UPDATE SET data = EXCLUDED.data`,
      [ids, stores, body.storeId]
    );
    return send(res, 200, { count: rowCount });
  }

  if (!['POST', 'PATCH'].includes(req.method)) return send(res, 405, { error: '操作不支持' });
  if (!stores.includes(body?.storeId) || !body.data || (req.method === 'PATCH' && !uuidRe.test(body.id))) {
    return send(res, 400, { error: '档案或门店无效' });
  }

  const data = Object.fromEntries(
    fields.map((key) => [key, typeof body.data[key] === 'string' ? body.data[key].trim().slice(0, 300) : ''])
  );

  // Resolve real role from identity.roles if roleId or data.role is supplied
  let resolvedRole = null;
  if (typeof body.roleId === 'string' && body.roleId.trim()) {
    const { rows: [r] } = await pool.query(
      `SELECT id, name, identity_type FROM identity.roles WHERE id = $1 AND identity_type <> 'supplier'`,
      [body.roleId.trim()]
    );
    if (!r) return send(res, 400, { error: '所选员工角色不存在' });
    resolvedRole = r;
  } else if (data.role) {
    const { rows: [r] } = await pool.query(
      `SELECT id, name, identity_type FROM identity.roles WHERE name = $1 AND identity_type <> 'supplier' LIMIT 1`,
      [data.role]
    );
    if (r) resolvedRole = r;
  }

  if (resolvedRole) {
    data.role = resolvedRole.name;
    data.roleId = resolvedRole.id;
  }

  if (!data.name) return send(res, 400, { error: '请输入员工姓名' });
  if (!data.role) return send(res, 400, { error: '请选择员工角色' });
  if ((data.age && !/^\d{1,3}$/.test(data.age)) || (data.limit && !/^\d{1,9}(\.\d{1,2})?$/.test(data.limit))
    || !['', '正常', '限制'].includes(data.loginStatus) || !['', '男', '女'].includes(data.gender)) {
    return send(res, 400, { error: '请核对姓名、年龄、调价额度、性别及登录限制备注' });
  }

  const wantUserAccount = Boolean(body.createUserAccount);
  const rawUsername = String(data.name||'').trim();
  const rawPassword = 'Admin@1234';

  if (wantUserAccount && !canManageUsers) {
    return send(res, 403, { error: '仅总部管理员可在新增/编辑员工时同步创建系统登录账号' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (req.method === 'POST') {
      let createdUserId = null;

      if (wantUserAccount) {
        if (!resolvedRole) {
          await client.query('ROLLBACK');
          return send(res, 400, { error: '开通系统登录账号必须选择一个有效的系统角色' });
        }
        if (!usernameRe.test(rawUsername)) {
          await client.query('ROLLBACK');
          return send(res, 400, { error: '登录账号使用真实姓名（1～64字），同名时请先处理重名' });
        }
        const initialPassword = rawPassword.trim() || 'Admin@1234';
        if (initialPassword.length < 6 || initialPassword.length > 64) {
          await client.query('ROLLBACK');
          return send(res, 400, { error: '初始登录密码长度需在 6 至 64 位之间' });
        }

        const { rows: [dupUser] } = await client.query(
          `SELECT id FROM identity.users WHERE lower(username) = lower($1) LIMIT 1`,
          [rawUsername]
        );
        if (dupUser) {
          await client.query('ROLLBACK');
          return send(res, 409, { error: `登录账号「${rawUsername}」已被占用` });
        }

        const userStatus = data.loginStatus === '限制' ? 'disabled' : 'active';
        const { rows: [newUser] } = await client.query(
          `INSERT INTO identity.users(username, display_name, status) VALUES ($1, $2, $3) RETURNING id`,
          [rawUsername, data.name, userStatus]
        );
        createdUserId = newUser.id;

        await client.query(
          `INSERT INTO identity.password_credentials(user_id, password_hash, password_algorithm)
           VALUES ($1, crypt($2, gen_salt('bf', 10)), 'bcrypt')`,
          [createdUserId, initialPassword]
        );

        const storeScope = resolvedRole.identity_type === 'admin' ? ALL_STORE_IDS : [body.storeId];
        await client.query(
          `INSERT INTO identity.user_access(user_id, role_id, store_ids, updated_by)
           VALUES ($1, $2, $3, $4)`,
          [createdUserId, resolvedRole.id, storeScope, user.id]
        );

        await client.query(
          `INSERT INTO identity.user_profiles(user_id, title, avatar_initials, theme_key)
           VALUES ($1, $2, $3, 'lime_charcoal')
           ON CONFLICT (user_id) DO NOTHING`,
          [createdUserId, resolvedRole.name, data.name.slice(0, 1)]
        );

        await client.query(
          `INSERT INTO identity.operation_log(actor_user_id, actor_role_id, actor_role_name, category, action, target, details)
           SELECT $1, a.role_id, r.name, '员工档案', '新增员工并开通账号', $2, $3::jsonb
           FROM identity.user_access a JOIN identity.roles r ON r.id = a.role_id WHERE a.user_id = $1`,
          [user.id, createdUserId, JSON.stringify({ username: rawUsername, role: resolvedRole.name })]
        );
      }

      const { rowCount } = await client.query(
        `INSERT INTO staff.profiles(store_id, user_id, data) VALUES ($1, $2, $3::jsonb)`,
        [body.storeId, createdUserId, JSON.stringify(data)]
      );
      await client.query('COMMIT');
      return send(res, 200, { count: rowCount });
    }

    // PATCH existing staff profile
    const { rows: [existing] } = await client.query(
      `SELECT p.*, u.is_system_admin, u.username, a.role_id AS cur_role_id, a.store_ids AS cur_store_ids
       FROM staff.profiles p
       LEFT JOIN identity.users u ON u.id = p.user_id
       LEFT JOIN identity.user_access a ON a.user_id = p.user_id
       WHERE p.id = $1 AND p.store_id = ANY($2::text[]) FOR UPDATE OF p`,
      [body.id, stores]
    );
    if (!existing) {
      await client.query('ROLLBACK');
      return send(res, 404, { error: '档案不存在' });
    }

    let linkedUserId = existing.user_id;

    if (linkedUserId) {
      const targetUserStatus = data.loginStatus === '限制' ? 'disabled' : 'active';
      if (existing.is_system_admin) {
        if ((resolvedRole && resolvedRole.id !== 'role_hq_admin') || targetUserStatus !== 'active') {
          await client.query('ROLLBACK');
          return send(res, 400, { error: '超级管理员账号的角色与正常状态受系统基线保护' });
        }
      }

      await client.query(
        `UPDATE identity.users SET display_name = $2, status = $3, updated_at = now() WHERE id = $1`,
        [linkedUserId, data.name, targetUserStatus]
      );

      if (resolvedRole && resolvedRole.id !== existing.cur_role_id) {
        if (!canManageUsers) {
          await client.query('ROLLBACK');
          return send(res, 403, { error: '变更已关联账号的系统角色需具备「用户权限管理」权限' });
        }
        if (linkedUserId === user.id) {
          await client.query('ROLLBACK');
          return send(res, 400, { error: '不能在员工档案中修改当前登录人自身角色' });
        }
        const curStores = Array.isArray(existing.cur_store_ids) ? existing.cur_store_ids : [];
        const nextStores =
          resolvedRole.identity_type === 'admin'
            ? ALL_STORE_IDS
            : Array.from(new Set([body.storeId, ...curStores]));
        await client.query(
          `UPDATE identity.user_access
           SET role_id = $2, store_ids = $3, permission_denies = '{}'::text[], updated_at = now(), updated_by = $4
           WHERE user_id = $1`,
          [linkedUserId, resolvedRole.id, nextStores, user.id]
        );
        await client.query(
          `INSERT INTO identity.operation_log(actor_user_id, actor_role_id, actor_role_name, category, action, target, details)
           SELECT $1, a.role_id, r.name, '员工档案', '同步更新员工角色', $2, $3::jsonb
           FROM identity.user_access a JOIN identity.roles r ON r.id = a.role_id WHERE a.user_id = $1`,
          [user.id, linkedUserId, JSON.stringify({ username: existing.username, role: resolvedRole.name })]
        );
      }
    } else if (wantUserAccount) {
      if (!resolvedRole) {
        await client.query('ROLLBACK');
        return send(res, 400, { error: '开通系统登录账号必须选择一个有效的系统角色' });
      }
      if (!usernameRe.test(rawUsername)) {
        await client.query('ROLLBACK');
        return send(res, 400, { error: '登录账号使用真实姓名（1～64字），同名时请先处理重名' });
      }
      const initialPassword = rawPassword.trim() || 'Admin@1234';
      if (initialPassword.length < 6 || initialPassword.length > 64) {
        await client.query('ROLLBACK');
        return send(res, 400, { error: '初始登录密码长度需在 6 至 64 位之间' });
      }
      const { rows: [dupUser] } = await client.query(
        `SELECT id FROM identity.users WHERE lower(username) = lower($1) LIMIT 1`,
        [rawUsername]
      );
      if (dupUser) {
        await client.query('ROLLBACK');
        return send(res, 409, { error: `登录账号「${rawUsername}」已被占用` });
      }
      const userStatus = data.loginStatus === '限制' ? 'disabled' : 'active';
      const { rows: [newUser] } = await client.query(
        `INSERT INTO identity.users(username, display_name, status) VALUES ($1, $2, $3) RETURNING id`,
        [rawUsername, data.name, userStatus]
      );
      linkedUserId = newUser.id;
      await client.query(
        `INSERT INTO identity.password_credentials(user_id, password_hash, password_algorithm)
         VALUES ($1, crypt($2, gen_salt('bf', 10)), 'bcrypt')`,
        [linkedUserId, initialPassword]
      );
      const storeScope = resolvedRole.identity_type === 'admin' ? ALL_STORE_IDS : [body.storeId];
      await client.query(
        `INSERT INTO identity.user_access(user_id, role_id, store_ids, updated_by)
         VALUES ($1, $2, $3, $4)`,
        [linkedUserId, resolvedRole.id, storeScope, user.id]
      );
      await client.query(
        `INSERT INTO identity.user_profiles(user_id, title, avatar_initials, theme_key)
         VALUES ($1, $2, $3, 'lime_charcoal')
         ON CONFLICT (user_id) DO NOTHING`,
        [linkedUserId, resolvedRole.name, data.name.slice(0, 1)]
      );
    }

    const { rowCount } = await client.query(
      `UPDATE staff.profiles SET store_id = $1, user_id = $2, data = staff.profiles.data || $3::jsonb
       WHERE id = $4 AND store_id = ANY($5::text[])`,
      [body.storeId, linkedUserId, JSON.stringify(data), body.id, stores]
    );

    await client.query('COMMIT');
    return send(res, rowCount ? 200 : 404, rowCount ? { count: rowCount } : { error: '档案不存在' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
