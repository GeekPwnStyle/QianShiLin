import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { Pool } from 'pg';
import { handleCatalog } from './catalog.js';
import { handlePurchase } from './purchase.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const cookieName = 'qsl_session';
const hash = value => createHash('sha256').update(value).digest('hex');
const send = (res, code, data, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
};
const readJson = async req => {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 65536) throw new Error('Request too large');
  }
  return JSON.parse(body);
};
const getToken = req => (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
const sessionUser = async token => {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { rows } = await pool.query(`SELECT u.id, u.username, u.display_name FROM identity.sessions s JOIN identity.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active'`, [hash(token)]);
  return rows[0] ?? null;
};
const server = http.createServer(async (req, res) => {
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
      const client = await pool.connect();
      try {
        const { rows } = await client.query(`SELECT u.id,u.username,u.display_name FROM identity.users u JOIN identity.password_credentials p ON p.user_id=u.id WHERE u.status='active' AND (lower(u.username)=lower($1) OR EXISTS (SELECT 1 FROM identity.login_aliases a WHERE a.user_id=u.id AND lower(a.alias)=lower($1))) AND p.password_hash=crypt($2,p.password_hash) LIMIT 1`, [username.trim(), password]);
        const user = rows[0];
        if (!user) return send(res, 401, { error: '用户名或密码错误。' });
        const token = randomBytes(32).toString('hex');
        await client.query(`INSERT INTO identity.sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '7 days')`, [hash(token), user.id]);
        await client.query(`UPDATE identity.users SET last_login_at=now() WHERE id=$1`, [user.id]);
        return send(res, 200, { user }, { 'Set-Cookie': `${cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/qian/api; Max-Age=604800` });
      } finally { client.release(); }
    }
    if (path === '/logout' && req.method === 'POST') {
      const token = getToken(req);
      if (token) await pool.query('DELETE FROM identity.sessions WHERE token_hash=$1', [hash(token)]);
      return send(res, 200, { ok: true }, { 'Set-Cookie': `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/qian/api; Max-Age=0` });
    }
    if (path.startsWith('/catalog/')) {
      const user = await sessionUser(getToken(req));
      if (await handleCatalog({ req, res, url, user, pool, send, readJson })) return;
    }
    if (path.startsWith('/purchase/')) {
      const user = await sessionUser(getToken(req));
      if (await handlePurchase({ req, res, url, user, pool, send, readJson })) return;
    }
    send(res, 404, { error: 'Not found' });
  } catch (error) {
    if (error instanceof SyntaxError || error.message === 'Request too large') {
      return send(res, 400, { error: 'Invalid JSON request' });
    }
    console.error(error);
    send(res, 500, { error: 'Server error' });
  }
});
server.listen(3001, '0.0.0.0');
