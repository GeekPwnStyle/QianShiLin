import { handleAccount, ensureAccountSchema } from './account.js';
import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { Pool } from 'pg';
import { handleCatalog } from './catalog.js';
import { handlePurchase } from './purchase.js';
import { handleManualInbound } from './manual-inbound.js';
import { handleSystemAccess } from './system-access.js';
import { handleNotices } from './notices.js';
import { handleStaff } from './staff.js';
import { handleCustomers } from './customers.js';
import { handleProducts } from './products.js';

const positiveInt = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}`);
  return value;
};
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: positiveInt('QSL_DB_POOL_MAX', 10),
  connectionTimeoutMillis: positiveInt('QSL_DB_WAIT_MS', 2000),
  statement_timeout: positiveInt('QSL_DB_STATEMENT_MS', 15000),
  lock_timeout: positiveInt('QSL_DB_LOCK_MS', 3000),
  idle_in_transaction_session_timeout: 15000,
});
pool.on('error', error => console.error('Database idle connection error', error.code));
const maxInFlight = positiveInt('QSL_MAX_IN_FLIGHT', 100);
let inFlight = 0;
const cookieName = 'qsl_session';
const hash = value => createHash('sha256').update(value).digest('hex');
const clientIp = req => req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? null;
const send = (res, code, data, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
};
const readJson = async (req, maxBytes = 65536) => {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > maxBytes) throw new Error('Request too large');
  }
  return JSON.parse(body);
};
const getToken = req => (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
const sessionUser = async token => {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await ensureAccountSchema(pool);
  const { rows } = await pool.query(`SELECT u.id, u.username, u.display_name, u.email,
           a.role_id, a.store_ids, a.permission_denies,
           r.name AS role_name, r.identity_type, r.sub_role,
           uca.supplier_id, sup.name AS supplier_name,
           COALESCE(NULLIF(up.title, ''), r.name, '系统成员') AS title,
           COALESCE(NULLIF(up.avatar_initials, ''), NULLIF(left(btrim(u.display_name), 1), ''), upper(left(u.username, 1))) AS avatar_initials,
           up.avatar_url,
           COALESCE(up.avatar_color_preset, 'charcoal') AS avatar_color_preset,
           COALESCE(up.theme_key, 'lime_charcoal') AS theme_key
    FROM identity.sessions s
    JOIN identity.users u ON u.id = s.user_id
    LEFT JOIN identity.user_access a ON a.user_id = u.id
    LEFT JOIN identity.roles r ON r.id = a.role_id
    LEFT JOIN identity.user_profiles up ON up.user_id = u.id
    LEFT JOIN identity.user_catalog_access uca ON uca.user_id = u.id
    LEFT JOIN catalog.suppliers sup ON sup.id = uca.supplier_id
    WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active'`, [hash(token)]);
  return rows[0] ?? null;
};
const server = http.createServer(async (req, res) => {
  if (inFlight >= maxInFlight) return send(res, 503, { error: 'Service busy; retry later' }, { 'Retry-After': '2' });
  inFlight++;
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    if (path === '/healthz') {
      await pool.query('SELECT 1');
      return send(res, 200, { ok: true });
    }
    if (path === '/session' && req.method === 'GET') {
      const user = await sessionUser(getToken(req));
      return send(res, user ? 200 : 401, user ? { user } : { error: 'Unauthorized' });
    }
    if (path === '/login' && req.method === 'POST') {
      const { username, password } = await readJson(req);
      if (typeof username !== 'string' || typeof password !== 'string' || username.length > 254 || password.length > 1024) return send(res, 400, { error: 'Invalid request' });
      await ensureAccountSchema(pool);
      const client = await pool.connect();
      try {
        const { rows } = await client.query(`SELECT u.id, u.username, u.display_name, u.email,
                 a.role_id, a.store_ids, a.permission_denies,
                 r.name AS role_name, r.identity_type, r.sub_role,
                 uca.supplier_id, sup.name AS supplier_name,
                 COALESCE(NULLIF(up.title, ''), r.name, '系统成员') AS title,
                 COALESCE(NULLIF(up.avatar_initials, ''), NULLIF(left(btrim(u.display_name), 1), ''), upper(left(u.username, 1))) AS avatar_initials,
                 up.avatar_url,
                 COALESCE(up.avatar_color_preset, 'charcoal') AS avatar_color_preset,
                 COALESCE(up.theme_key, 'lime_charcoal') AS theme_key
          FROM identity.users u
          JOIN identity.password_credentials p ON p.user_id = u.id
          LEFT JOIN identity.user_access a ON a.user_id = u.id
          LEFT JOIN identity.roles r ON r.id = a.role_id
          LEFT JOIN identity.user_profiles up ON up.user_id = u.id
          LEFT JOIN identity.user_catalog_access uca ON uca.user_id = u.id
          LEFT JOIN catalog.suppliers sup ON sup.id = uca.supplier_id
          WHERE u.status = 'active' AND (lower(u.username) = lower($1) OR EXISTS (SELECT 1 FROM identity.login_aliases la WHERE la.user_id = u.id AND lower(la.alias) = lower($1)))
          AND p.password_hash = crypt($2, p.password_hash) LIMIT 1`, [username.trim(), password]);
        const user = rows[0];
        if (!user) return send(res, 401, { error: '用户名或密码错误。' });
        const token = randomBytes(32).toString('hex');
        await client.query(`INSERT INTO identity.sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '7 days')`, [hash(token), user.id]);
        await client.query(`UPDATE identity.users SET last_login_at=now() WHERE id=$1`, [user.id]);
        await client.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,ip_address)
          SELECT $1,a.role_id,r.name,'登录','登入系统',$2 FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id,clientIp(req)]);
        return send(res, 200, { user }, { 'Set-Cookie': `${cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/qian/api; Max-Age=604800` });
      } finally { client.release(); }
    }
    if (path === '/logout' && req.method === 'POST') {
      const token = getToken(req);
      const user = await sessionUser(token);
      if (user) await pool.query(`INSERT INTO identity.operation_log(actor_user_id,actor_role_id,actor_role_name,category,action,ip_address)
        SELECT $1,a.role_id,r.name,'登录','退出登录',$2 FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id WHERE a.user_id=$1`,[user.id,clientIp(req)]);
      if (token) await pool.query('DELETE FROM identity.sessions WHERE token_hash=$1', [hash(token)]);
      return send(res, 200, { ok: true }, { 'Set-Cookie': `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/qian/api; Max-Age=0` });
    }
    if (path.startsWith('/account/')) {
      const user = await sessionUser(getToken(req));
      if (await handleAccount({ req, res, url, user, pool, send, readJson, clientIp })) return;
    }
    if (path.startsWith('/catalog/')) {
      const user = await sessionUser(getToken(req));
      if (await handleCatalog({ req, res, url, user, pool, send, readJson })) return;
    }
    if (path.startsWith('/purchase/')) {
      const user = await sessionUser(getToken(req));
      if (await handleManualInbound({ req, res, url, user, pool, send, readJson })) return;
      if (await handlePurchase({ req, res, url, user, pool, send, readJson })) return;
    }
    if (path.startsWith('/system/')) {
      const user = await sessionUser(getToken(req));
      if (await handleSystemAccess({ req, res, url, user, pool, send, readJson })) return;
    }
    if (path.startsWith('/notices/')) {
      const user = await sessionUser(getToken(req));
      if (await handleNotices({ req, res, url, user, pool, send, readJson })) return;
    }
    if (path === '/staff') {
      return await handleStaff({ req, res, url, user: await sessionUser(getToken(req)), pool, send, readJson });
    }
    if (path === '/customers' || path.startsWith('/customers/')) {
      const user = await sessionUser(getToken(req));
      if (await handleCustomers({ req, res, url, user, pool, send, readJson, clientIp })) return;
    }
    if (
      path === '/products' || path.startsWith('/products/') ||
      path === '/product-categories' || path.startsWith('/product-categories/') ||
      path === '/product-tags' || path.startsWith('/product-tags/') ||
      path === '/product-dictionaries' || path.startsWith('/product-dictionaries/') ||
      path === '/lens-surcharges' || path.startsWith('/lens-surcharges/')
    ) {
      const user = await sessionUser(getToken(req));
      if (await handleProducts({ req, res, url, user, pool, send, readJson, clientIp })) return;
    }
    send(res, 404, { error: 'Not found' });
  } catch (error) {
    if (error instanceof SyntaxError || error.message === 'Request too large') {
      return send(res, 400, { error: 'Invalid JSON request' });
    }
    if (['57014', '55P03', '53300'].includes(error.code) || /timeout|connection terminated/i.test(error.message)) {
      console.error('Database request unavailable', error.code ?? 'timeout');
      return send(res, 503, { error: 'Service busy; retry later' }, { 'Retry-After': '2' });
    }
    console.error(error);
    send(res, 500, { error: 'Server error' });
  } finally {
    inFlight--;
  }
});
server.listen(3001, '0.0.0.0');
