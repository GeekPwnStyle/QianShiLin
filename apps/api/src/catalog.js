const definitions = {
  brands: {
    table: 'catalog.brands',
    fields: {
      name: 'text', alias: 'text', kind: 'text', natures: 'textArray', series: 'textArray',
      remark: 'text', pinned: 'boolean', enabled: 'boolean',
    },
    required: ['name', 'kind'],
    order: 'pinned DESC, name ASC',
  },
  suppliers: {
    table: 'catalog.suppliers',
    fields: {
      name: 'text', alias: 'text', contact: 'text', phone: 'text', categories: 'textArray',
      is_default: 'boolean', enabled: 'boolean', province: 'text', city: 'text',
      district: 'text', detail_address: 'text', scope: 'text', credit_code: 'text',
      business_license_expires_on: 'date', device_license_number: 'text',
      device_license_expires_on: 'date', bank_holder: 'text', bank_branch: 'text',
      bank_account: 'text', remark: 'text',
    },
    required: ['name'],
    order: 'created_at DESC',
  },
  warehouses: {
    table: 'catalog.warehouses',
    fields: {
      code: 'text', name: 'text', contact_phone: 'text', warehouse_type: 'text',
      remark: 'text', display_order: 'integer', enabled: 'boolean',
    },
    required: ['code', 'name', 'warehouse_type'],
    order: 'display_order ASC, name ASC',
  },
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;
function visibleRow(row, role, resource) {
  if (role !== 'store' || resource !== 'suppliers') return row;
  const { bank_holder, bank_branch, bank_account, ...visible } = row;
  return visible;
}

function validate(body, definition, creating) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid payload');
  const entries = Object.entries(body);
  if (!entries.length || entries.length > 30) throw new Error('Invalid field count');
  for (const [key, value] of entries) {
    const type = definition.fields[key];
    if (!type) throw new Error(`Unsupported field: ${key}`);
    if (type === 'text' && (typeof value !== 'string' || value.length > 2000)) throw new Error(`Invalid field: ${key}`);
    if (type === 'boolean' && typeof value !== 'boolean') throw new Error(`Invalid field: ${key}`);
    if (type === 'integer' && (!Number.isInteger(value) || value < 0 || value > 100000)) throw new Error(`Invalid field: ${key}`);
    if (type === 'date' && value !== null && (typeof value !== 'string' || !date.test(value))) throw new Error(`Invalid field: ${key}`);
    if (type === 'textArray' && (!Array.isArray(value) || value.length > 30 || value.some(x => typeof x !== 'string' || x.length > 120))) throw new Error(`Invalid field: ${key}`);
  }
  if (creating && definition.required.some(key => typeof body[key] !== 'string' || !body[key].trim())) throw new Error('Required field missing');
  for (const key of definition.required) if (key in body && !body[key].trim()) throw new Error(`Required field: ${key}`);
  if ('kind' in body && !['自营品牌','代理品牌'].includes(body.kind)) throw new Error('Invalid brand kind');
  return entries;
}

export async function handleCatalog({ req, res, url, user, pool, send, readJson }) {
  const match = /^\/catalog\/(brands|suppliers|warehouses)(?:\/([^/]+))?$/.exec(url.pathname);
  if (!match) return false;
  if (!user) { send(res, 401, { error: 'Unauthorized' }); return true; }
  const [, resource, id] = match;
  const definition = definitions[resource];
  const { rows: accessRows } = await pool.query(
    'SELECT role,supplier_id FROM identity.user_catalog_access WHERE user_id=$1', [user.id]
  );
  const access = accessRows[0];
  if (!access || (access.role === 'supplier' && (resource !== 'suppliers' || !access.supplier_id))) {
    send(res, 403, { error: 'Forbidden' }); return true;
  }
  const { rows: roleRows } = await pool.query(`SELECT r.permissions,a.permission_denies
    FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id]);
  const role = roleRows[0];
  const allowed = code => role?.permissions.includes(code) && !role.permission_denies.includes(code);
  const readCode = { brands:'basic.brand.read', suppliers:'basic.supplier.read', warehouses:'system.store.manage' }[resource];
  const canRead = allowed(readCode) || (resource === 'suppliers' && allowed('purchase.create'));
  if (!canRead) { send(res, 403, { error: 'Forbidden' }); return true; }
  if (req.method !== 'GET' && !allowed(readCode)) {
    send(res, 403, { error: 'Forbidden' }); return true;
  }
  if (req.method !== 'GET' && access.role !== 'admin') {
    send(res, 403, { error: 'Forbidden' }); return true;
  }
  if (id && !uuid.test(id)) { send(res, 400, { error: 'Invalid id' }); return true; }
  try {
    if (req.method === 'GET' && id) {
      const { rows } = await pool.query(`SELECT * FROM ${definition.table} WHERE id=$1${access.role === 'supplier' ? ' AND id=$2' : ''}`, access.role === 'supplier' ? [id, access.supplier_id] : [id]);
      send(res, rows.length ? 200 : 404, rows[0] ? visibleRow(rows[0], access.role, resource) : { error: 'Not found' }); return true;
    }
    if (req.method === 'GET') {
      const page = Math.min(10000, Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1));
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') ?? '20', 10) || 20));
      const search = (url.searchParams.get('search') ?? '').trim().slice(0, 120);
      const values = [search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : null];
      let where = "WHERE ($1::text IS NULL OR name ILIKE $1 ESCAPE '\\')";
      if (access.role === 'supplier') { values.push(access.supplier_id); where += ' AND id=$2'; }
      const count = await pool.query(`SELECT count(*)::int AS total FROM ${definition.table} ${where}`, values);
      values.push(pageSize, (page - 1) * pageSize);
      const { rows } = await pool.query(`SELECT * FROM ${definition.table} ${where} ORDER BY ${definition.order} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
      send(res, 200, { items: rows.map(row => visibleRow(row, access.role, resource)), total: count.rows[0].total, page, pageSize }); return true;
    }
    if (req.method === 'POST' && !id) {
      const entries = validate(await readJson(req), definition, true);
      const columns = entries.map(([key]) => key);
      const values = entries.map(([, value]) => value);
      const placeholders = values.map((_, index) => `$${index + 1}`);
      const { rows } = await pool.query(`INSERT INTO ${definition.table} (${columns.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values);
      send(res, 201, rows[0]); return true;
    }
    if (req.method === 'PATCH' && id) {
      const entries = validate(await readJson(req), definition, false);
      const values = entries.map(([, value]) => value);
      const assignments = entries.map(([key], index) => `${key}=$${index + 1}`);
      values.push(id);
      const { rows } = await pool.query(`UPDATE ${definition.table} SET ${assignments.join(',')},updated_at=now() WHERE id=$${values.length} RETURNING *`, values);
      send(res, rows.length ? 200 : 404, rows[0] ?? { error: 'Not found' }); return true;
    }
    if (req.method === 'DELETE' && id) {
      const { rowCount } = await pool.query(`DELETE FROM ${definition.table} WHERE id=$1`, [id]);
      send(res, rowCount ? 200 : 404, rowCount ? { ok: true } : { error: 'Not found' }); return true;
    }
    send(res, 405, { error: 'Method not allowed' }); return true;
  } catch (error) {
    if (error.message.startsWith('Invalid') || error.message.startsWith('Unsupported') || error.message.startsWith('Required')) {
      send(res, 400, { error: error.message }); return true;
    }
    if (error.code === '22001' || error.code === '22007' || error.code === '22008' || error.code === '22P02') {
      send(res, 400, { error: 'Invalid field value' }); return true;
    }
    if (error.code === '23505' || error.code === '23503') {
      send(res, 409, { error: 'Record conflicts with existing data' }); return true;
    }
    throw error;
  }
}
