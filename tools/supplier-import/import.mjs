import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/api/package.json', import.meta.url));

export function validateSource(data) {
  if (!data.source || !Array.isArray(data.accounts) || !data.accounts.length) throw new Error('Missing source/accounts');
  const usernames = new Set();
  for (const a of data.accounts) {
    if (!a.username?.trim() || usernames.has(a.username.toLowerCase())) throw new Error('Duplicate/blank username');
    usernames.add(a.username.toLowerCase());
    if (!Array.isArray(a.suppliers) || !a.suppliers.length || new Set(a.suppliers).size !== a.suppliers.length) throw new Error('Empty/duplicate grants');
    if (a.suppliers.some(n => typeof n !== 'string' || !n.trim() || n.length > 180)) throw new Error('Invalid supplier name');
  }
  return [...new Set(data.accounts.flatMap(a => a.suppliers))];
}

export async function importSource(pool, data, apply = false) {
  const names = validateSource(data);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SELECT pg_advisory_xact_lock(hashtext('qsl-legacy-supplier-import'))");
    const map = new Map();
    let inserted = 0;
    for (const name of names) {
      const { rows } = await c.query('SELECT id FROM catalog.suppliers WHERE lower(name) = lower($1)', [name]);
      if (rows.length > 1) throw new Error(`Ambiguous existing supplier: ${name}`);
      if (rows.length) map.set(name, rows[0].id);
      else {
        const { rows: [row] } = await c.query(`INSERT INTO catalog.suppliers
          (name, auto_provision_account, owner_store_name, owner_store_type, remark)
          VALUES ($1, false, '', '', $2) RETURNING id`,
          [name, `来源：${data.source}；仅已知名称，联系方式及资质待补充。`]);
        map.set(name, row.id); inserted++;
      }
    }
    let grants = 0;
    for (const a of data.accounts) {
      const { rows: [row] } = await c.query(`INSERT INTO catalog.legacy_supplier_accounts
        (source,username,legacy_role,legacy_status,phone,legacy_created_at,legacy_updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (source,username) DO UPDATE SET
        legacy_role=EXCLUDED.legacy_role, legacy_status=EXCLUDED.legacy_status,
        phone=EXCLUDED.phone, legacy_created_at=EXCLUDED.legacy_created_at, legacy_updated_at=EXCLUDED.legacy_updated_at
        RETURNING id`, [data.source,a.username,a.role,a.status,a.phone,a.createdAt,a.updatedAt]);
      // Source snapshots are additive: a rerun cannot revoke manually reconciled relations.
      for (const name of a.suppliers) {
        await c.query(`INSERT INTO catalog.legacy_supplier_account_grants
          (account_id,supplier_id,source_name,needs_review) VALUES ($1,$2,$3,$4)
          ON CONFLICT (account_id,supplier_id) DO NOTHING`,
          [row.id,map.get(name),name,(data.reviewNames ?? []).includes(name)]);
        grants++;
      }
    }
    await c.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { applied: apply, suppliers: names.length, inserted, accounts: data.accounts.length, grants };
  } catch (error) {
    await c.query('ROLLBACK'); throw error;
  } finally { c.release(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { Pool } = require('pg');
  const data = JSON.parse(await fs.readFile(new URL('./legacy-suppliers.json', import.meta.url), 'utf8'));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try { console.log(JSON.stringify(await importSource(pool, data, process.argv.includes('--apply')))); }
  finally { await pool.end(); }
}
