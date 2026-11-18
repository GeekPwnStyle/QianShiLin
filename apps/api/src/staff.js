const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = ['name','role','department','limit','age','gender','education','phone','address','loginStatus','tags'];

export async function handleStaff({ req, res, url, user, pool, send, readJson }) {
  if (!user) return send(res, 401, { error: '请登录' });
  const { rows: [actor] } = await pool.query(
    'SELECT a.store_ids,a.permission_denies,r.permissions,r.identity_type FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1',
    [user.id],
  );
  const has = code => actor?.permissions.includes(code) && !actor.permission_denies.includes(code);
  if (!has('basic.staff.read') || actor.identity_type === 'supplier') return send(res, 403, { error: '无员工档案权限' });
  const stores = actor.store_ids;
  const canEdit = has('basic.staff.update') || (actor.identity_type === 'admin' && has('system.user.manage') && !actor.permission_denies.includes('basic.staff.update'));
  if (req.method === 'GET') {
    const { rows } = await pool.query('SELECT id,store_id,data FROM staff.profiles WHERE store_id=ANY($1::text[]) ORDER BY data->>\'name\',id', [stores]);
    return send(res, 200, { rows, canEdit });
  }
  if (!canEdit) return send(res, 403, { error: '无员工档案维护权限' });
  const body = await readJson(req, 16384);
  const action = url.searchParams.get('action');
  if (req.method === 'POST' && (action === 'delete' || action === 'sync')) {
    const ids = body?.ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || !ids.every(id => typeof id === 'string' && uuid.test(id))) return send(res, 400, { error: '请选择 1 至 100 条档案' });
    if (action === 'delete') {
      const { rowCount } = await pool.query('DELETE FROM staff.profiles WHERE id=ANY($1::uuid[]) AND store_id=ANY($2::text[])', [ids, stores]);
      return send(res, 200, { count: rowCount });
    }
    if (!stores.includes(body.storeId)) return send(res, 403, { error: '目标门店不在授权范围' });
    const { rowCount } = await pool.query(`INSERT INTO staff.profiles(store_id,source_id,data)
      SELECT DISTINCT ON (COALESCE(source_id,id)) $3,COALESCE(source_id,id),data FROM staff.profiles
      WHERE id=ANY($1::uuid[]) AND store_id=ANY($2::text[]) AND store_id<>$3 AND COALESCE(source_id,id) NOT IN (SELECT id FROM staff.profiles WHERE store_id=$3)
      ORDER BY COALESCE(source_id,id),id
      ON CONFLICT (store_id,source_id) DO UPDATE SET data=EXCLUDED.data`, [ids, stores, body.storeId]);
    return send(res, 200, { count: rowCount });
  }
  if (!['POST','PATCH'].includes(req.method)) return send(res, 405, { error: '操作不支持' });
  if (!stores.includes(body?.storeId) || !body.data || (req.method === 'PATCH' && !uuid.test(body.id))) return send(res, 400, { error: '档案或门店无效' });
  const data = Object.fromEntries(fields.map(key => [key, typeof body.data[key] === 'string' ? body.data[key].trim().slice(0, 300) : '']));
  if (!data.name || (data.age && !/^\d{1,3}$/.test(data.age)) || (data.limit && !/^\d{1,9}(\.\d{1,2})?$/.test(data.limit))
    || !['','正常','限制'].includes(data.loginStatus) || !['','男','女'].includes(data.gender)) return send(res, 400, { error: '请核对姓名、年龄、调价额度、性别及登录限制备注' });
  const args = [body.storeId, JSON.stringify(data)];
  const { rowCount } = req.method === 'POST'
    ? await pool.query('INSERT INTO staff.profiles(store_id,data) VALUES($1,$2::jsonb)', args)
    : await pool.query('UPDATE staff.profiles SET store_id=$1,data=$2::jsonb WHERE id=$3 AND store_id=ANY($4::text[])', [...args, body.id, stores]);
  return send(res, rowCount ? 200 : 404, rowCount ? { count: rowCount } : { error: '档案不存在' });
}
