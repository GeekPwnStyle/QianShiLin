import { randomBytes } from 'node:crypto';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const money = value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100000000;

export async function handleManualInbound({ req, res, url, user, pool, send, readJson }) {
  const match = /^\/purchase\/manual-inbound(?:\/([^/]+))?$/.exec(url.pathname);
  if (!match) return false;
  if (!user) { send(res, 401, { error: 'Unauthorized' }); return true; }
  const { rows: scopes } = await pool.query(`SELECT a.store_ids,
    ('purchase.read'=ANY(r.permissions) AND NOT 'purchase.read'=ANY(a.permission_denies)) AS can_read,
    ('purchase.create'=ANY(r.permissions) AND NOT 'purchase.create'=ANY(a.permission_denies)) AS can_create
    FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`, [user.id]);
  const scope = scopes[0];
  if (!scope?.store_ids?.length || !scope.can_read) { send(res, 403, { error: 'Forbidden' }); return true; }
  const id = match[1];
  if (id && !uuid.test(id)) { send(res, 400, { error: 'Invalid id' }); return true; }
  if (req.method === 'GET' && id) {
    const { rows } = await pool.query(`SELECT d.*,s.name AS supplier_name,u.display_name AS creator_name
      FROM purchase.manual_inbound_drafts d JOIN catalog.suppliers s ON s.id=d.supplier_id
      JOIN identity.users u ON u.id=d.created_by WHERE d.id=$1 AND d.store_id=ANY($2::text[])`, [id, scope.store_ids]);
    if (!rows.length) { send(res, 404, { error: 'Not found' }); return true; }
    const lines = await pool.query('SELECT * FROM purchase.manual_inbound_lines WHERE draft_id=$1 ORDER BY id', [id]);
    send(res, 200, { ...rows[0], lines: lines.rows }); return true;
  }
  if (req.method === 'GET') {
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1));
    const pageSize = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get('pageSize') ?? '20', 10) || 20));
    const storeId = clean(url.searchParams.get('storeId'), 80);
    if (storeId && !scope.store_ids.includes(storeId)) { send(res, 403, { error: 'Store out of scope' }); return true; }
    const search = clean(url.searchParams.get('search'), 120).replace(/[\\%_]/g, '\\$&');
    const values = [scope.store_ids, storeId || null, search ? `%${search}%` : null];
    const from = 'FROM purchase.manual_inbound_drafts d JOIN catalog.suppliers s ON s.id=d.supplier_id JOIN identity.users u ON u.id=d.created_by';
    const where = "WHERE d.store_id=ANY($1::text[]) AND ($2::text IS NULL OR d.store_id=$2) AND ($3::text IS NULL OR d.draft_no ILIKE $3 ESCAPE '\\' OR s.name ILIKE $3 ESCAPE '\\')";
    const count = await pool.query(`SELECT count(*)::int AS total ${from} ${where}`, values);
    const { rows } = await pool.query(`SELECT d.*,s.name AS supplier_name,u.display_name AS creator_name,
      COALESCE((SELECT sum(l.quantity) FROM purchase.manual_inbound_lines l WHERE l.draft_id=d.id),0)::int AS quantity,
      COALESCE((SELECT sum(l.quantity*l.purchase_price) FROM purchase.manual_inbound_lines l WHERE l.draft_id=d.id),0)::numeric(14,2) AS goods_amount
      ${from} ${where} ORDER BY d.created_at DESC LIMIT $4 OFFSET $5`, [...values, pageSize, (page-1)*pageSize]);
    send(res, 200, { items: rows, total: count.rows[0].total, page, pageSize }); return true;
  }
  if (req.method === 'POST' && !id) {
    if (!scope.can_create) { send(res, 403, { error: 'Forbidden' }); return true; }
    let body;
    try { body = await readJson(req); } catch { send(res, 400, { error: 'Invalid JSON' }); return true; }
    const lines = body?.lines;
    if (!scope.store_ids.includes(clean(body?.storeId, 80)) || !uuid.test(body?.supplierId ?? '')
      || !date.test(body?.businessDate ?? '') || (body?.expectedReceiptDate && !date.test(body.expectedReceiptDate))
      || !['store','headquarters'].includes(body?.settlementType)
      || !money(body?.freight) || !Array.isArray(lines) || !lines.length || lines.length > 100
      || lines.some(line => !clean(line?.productName,240) || !Number.isInteger(line?.quantity)
        || line.quantity < 1 || line.quantity > 100000 || !money(line?.purchasePrice) || !money(line?.retailPrice))) {
      send(res, 400, { error: 'Invalid inbound draft data' }); return true;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const draftNo = `MI${new Date().toISOString().slice(0,10).replaceAll('-','')}${randomBytes(5).toString('hex').toUpperCase()}`;
      const { rows } = await client.query(`INSERT INTO purchase.manual_inbound_drafts
        (draft_no,store_id,supplier_id,business_date,expected_receipt_date,settlement_type,external_order_no,note,supplier_note,freight,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [draftNo,body.storeId,body.supplierId,body.businessDate,body.expectedReceiptDate || null,
          body.settlementType,clean(body.externalOrderNo,120),clean(body.note,1000),clean(body.supplierNote,1000),body.freight,user.id]);
      const lineValues = [];
      const placeholders = lines.map(line => {
        const offset = lineValues.length;
        lineValues.push(rows[0].id, clean(line.productName,240), clean(line.categoryName,120),
          clean(line.brand,120), clean(line.series,120), clean(line.model,120),
          line.purchasePrice, line.retailPrice, line.quantity, clean(line.note,500));
        return '(' + Array.from({length:10}, (_,i) => '$' + (offset+i+1)).join(',') + ')';
      });
      await client.query(`INSERT INTO purchase.manual_inbound_lines
        (draft_id,product_name,category_name,brand,series,model,purchase_price,retail_price,quantity,note)
        VALUES ${placeholders.join(',')}`, lineValues);
      await client.query('COMMIT');
      send(res, 201, { ...rows[0], lines }); return true;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23503' || error.code === '22008') { send(res, 400, { error: 'Invalid supplier or date' }); return true; }
      throw error;
    } finally { client.release(); }
  }
  send(res, 405, { error: 'Method not allowed' }); return true;
}
