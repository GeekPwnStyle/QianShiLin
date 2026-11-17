import { randomBytes } from 'node:crypto';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const clip = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function handlePurchase({ req, res, url, user, pool, send, readJson }) {
  const match = /^\/purchase\/orders(?:\/([^/]+))?$/.exec(url.pathname);
  if (!match) return false;
  if (!user) { send(res, 401, { error: 'Unauthorized' }); return true; }
  const { rows: scopes } = await pool.query(`SELECT a.store_ids,
    ('purchase.read'=ANY(r.permissions) AND NOT 'purchase.read'=ANY(a.permission_denies)) AS can_read,
    ('purchase.create'=ANY(r.permissions) AND NOT 'purchase.create'=ANY(a.permission_denies)) AS can_create
    FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`, [user.id]);
  const scope = scopes[0];
  if (!scope || !scope.store_ids.length || !scope.can_read) { send(res, 403, { error: 'Forbidden' }); return true; }
  const id = match[1];
  if (id && !uuid.test(id)) { send(res, 400, { error: 'Invalid id' }); return true; }

  if (req.method === 'GET' && id) {
    const { rows } = await pool.query(
      `SELECT o.*,s.name AS supplier_name,u.display_name AS creator_name
       FROM purchase.orders o LEFT JOIN catalog.suppliers s ON s.id=o.supplier_id
       JOIN identity.users u ON u.id=o.created_by
       WHERE o.id=$1 AND o.store_id=ANY($2::text[])`, [id, scope.store_ids]
    );
    if (!rows.length) { send(res, 404, { error: 'Not found' }); return true; }
    const lines = await pool.query('SELECT * FROM purchase.order_lines WHERE order_id=$1 ORDER BY id', [id]);
    send(res, 200, { ...rows[0], lines: lines.rows }); return true;
  }
  if (req.method === 'GET') {
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1));
    const pageSize = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get('pageSize') ?? '20', 10) || 20));
    const search = clip(url.searchParams.get('search'), 120);
    const storeId = clip(url.searchParams.get('storeId'), 80);
    if (storeId && !scope.store_ids.includes(storeId)) { send(res, 403, { error: 'Store out of scope' }); return true; }
    const values = [scope.store_ids, storeId || null, search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : null];
    const where = "WHERE o.store_id=ANY($1::text[]) AND ($2::text IS NULL OR o.store_id=$2) AND ($3::text IS NULL OR o.order_no ILIKE $3 ESCAPE '\\' OR s.name ILIKE $3 ESCAPE '\\')";
    const from = 'FROM purchase.orders o LEFT JOIN catalog.suppliers s ON s.id=o.supplier_id JOIN identity.users u ON u.id=o.created_by';
    const count = await pool.query(`SELECT count(*)::int AS total ${from} ${where}`, values);
    const { rows } = await pool.query(
      `SELECT o.*,s.name AS supplier_name,u.display_name AS creator_name,
       COALESCE((SELECT sum(ordered_qty) FROM purchase.order_lines l WHERE l.order_id=o.id),0)::int AS ordered_qty,
       COALESCE((SELECT sum(accepted_qty) FROM purchase.order_lines l WHERE l.order_id=o.id),0)::int AS accepted_qty
       ${from} ${where} ORDER BY o.created_at DESC LIMIT $4 OFFSET $5`,
      [...values, pageSize, (page - 1) * pageSize]
    );
    send(res, 200, { items: rows, total: count.rows[0].total, page, pageSize }); return true;
  }
  if (req.method === 'POST' && !id) {
    if (!scope.can_create) { send(res, 403, { error: 'Forbidden' }); return true; }
    let body;
    try { body = await readJson(req); }
    catch { send(res, 400, { error: 'Invalid JSON' }); return true; }
    const storeId = clip(body?.storeId, 80);
    const supplierId = body?.supplierId || null;
    const lines = body?.lines;
    if (!scope.store_ids.includes(storeId) || !['single','series'].includes(body?.orderType)
      || !isoDate.test(body?.orderDate ?? '') || !Array.isArray(lines) || !lines.length || lines.length > 100
      || (supplierId && !uuid.test(supplierId))
      || lines.some(line => !clip(line?.productName, 240) || !Number.isInteger(line?.orderedQty)
        || line.orderedQty < 1 || line.orderedQty > 100000)) {
      send(res, 400, { error: 'Invalid order data' }); return true;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orderNo = `PO${new Date().toISOString().slice(0,10).replaceAll('-','')}${randomBytes(5).toString('hex').toUpperCase()}`;
      const inserted = await client.query(
        `INSERT INTO purchase.orders(order_no,store_id,supplier_id,order_type,order_date,note,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [orderNo, storeId, supplierId, body.orderType, body.orderDate, clip(body.note, 2000), user.id]
      );
      for (const line of lines) await client.query(
        `INSERT INTO purchase.order_lines(order_id,product_name,category_name,brand,series,model,ordered_qty,note)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [inserted.rows[0].id, clip(line.productName, 240), clip(line.categoryName, 120),
          clip(line.brand, 120), clip(line.series, 120), clip(line.model, 120), line.orderedQty, clip(line.note, 500)]
      );
      await client.query('COMMIT');
      send(res, 201, { ...inserted.rows[0], lines }); return true;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23503' || error.code === '22008') { send(res, 400, { error: 'Invalid supplier or date' }); return true; }
      throw error;
    } finally { client.release(); }
  }
  send(res, 405, { error: 'Method not allowed' }); return true;
}
