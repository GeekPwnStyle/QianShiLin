export const ALLOWED_THEMES = new Set([
  'lime_charcoal',
  'emerald_mint',
  'azure_cobalt',
  'amber_bronze',
  'violet_plum',
  'rose_coral',
]);

export const ALLOWED_AVATAR_PRESETS = new Set([
  'charcoal',
  'lime',
  'forest',
  'amber',
  'slate',
]);

const DATA_IMAGE_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

let schemaReadyPromise = null;

export function ensureAccountSchema(pool) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS identity.user_profiles (
          user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
          title varchar(120) NOT NULL DEFAULT '',
          avatar_initials varchar(8) NOT NULL DEFAULT '',
          avatar_url text,
          avatar_color_preset varchar(24) NOT NULL DEFAULT 'charcoal'
            CHECK (avatar_color_preset IN ('charcoal', 'lime', 'forest', 'amber', 'slate')),
          theme_key varchar(32) NOT NULL DEFAULT 'lime_charcoal'
            CHECK (theme_key IN (
              'lime_charcoal',
              'emerald_mint',
              'azure_cobalt',
              'amber_bronze',
              'violet_plum',
              'rose_coral'
            )),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        INSERT INTO identity.user_profiles (user_id, title, avatar_initials, avatar_color_preset, theme_key)
        SELECT u.id,
               CASE lower(u.username)
                 WHEN 'admin' THEN '营运总监 · 管理员'
                 WHEN 'manager' THEN '店长 · 杭州西湖旗舰店'
                 WHEN 'guide' THEN '导购员 · 杭州滨江天街店'
                 WHEN 'optometrist' THEN '高级验光师 · 杭州西湖旗舰店'
                 WHEN 'supplier' THEN '供应链协调人 · 卡尔蔡司光学华东代理'
                 ELSE COALESCE(r.name, '系统成员')
               END,
               COALESCE(NULLIF(left(btrim(u.display_name), 1), ''), upper(left(u.username, 1))),
               'charcoal',
               'lime_charcoal'
        FROM identity.users u
        LEFT JOIN identity.user_access a ON a.user_id = u.id
        LEFT JOIN identity.roles r ON r.id = a.role_id
        ON CONFLICT (user_id) DO NOTHING
      `);
    })().catch(error => {
      schemaReadyPromise = null;
      throw error;
    });
  }
  return schemaReadyPromise;
}

function normalizeText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

export async function handleAccount({ req, res, url, user, pool, send, readJson, clientIp }) {
  const path = url.pathname;
  if (!path.startsWith('/account/')) return false;
  if (!user) {
    send(res, 401, { error: 'Unauthorized' });
    return true;
  }

  await ensureAccountSchema(pool);

  if (path === '/account/profile' && req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.email,
              COALESCE(NULLIF(up.title, ''), r.name, '系统成员') AS title,
              COALESCE(NULLIF(up.avatar_initials, ''), NULLIF(left(btrim(u.display_name), 1), ''), upper(left(u.username, 1))) AS avatar_initials,
              up.avatar_url,
              COALESCE(up.avatar_color_preset, 'charcoal') AS avatar_color_preset,
              COALESCE(up.theme_key, 'lime_charcoal') AS theme_key,
              up.updated_at
       FROM identity.users u
       LEFT JOIN identity.user_access a ON a.user_id = u.id
       LEFT JOIN identity.roles r ON r.id = a.role_id
       LEFT JOIN identity.user_profiles up ON up.user_id = u.id
       WHERE u.id = $1`,
      [user.id]
    );
    if (!rows.length) {
      send(res, 404, { error: 'Not found' });
      return true;
    }
    send(res, 200, { profile: rows[0] });
    return true;
  }

  if (path === '/account/profile' && (req.method === 'PUT' || req.method === 'PATCH')) {
    let body;
    try {
      body = await readJson(req, 131072);
    } catch (error) {
      send(res, 400, { error: error.message === 'Request too large' ? '头像图片或请求体过大' : 'Invalid JSON' });
      return true;
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      send(res, 400, { error: 'Invalid payload' });
      return true;
    }

    const nextTheme = body.themeKey ?? body.theme_key;
    const nextPreset = body.avatarColorPreset ?? body.avatar_color_preset;
    const nextInitials = body.avatarInitials ?? body.avatar_initials;
    const nextUrl = 'avatarUrl' in body ? body.avatarUrl : 'avatar_url' in body ? body.avatar_url : undefined;
    const nextTitle = body.title;

    if (nextTheme !== undefined && (typeof nextTheme !== 'string' || !ALLOWED_THEMES.has(nextTheme))) {
      send(res, 400, { error: '不支持的主题色方案' });
      return true;
    }
    if (nextPreset !== undefined && (typeof nextPreset !== 'string' || !ALLOWED_AVATAR_PRESETS.has(nextPreset))) {
      send(res, 400, { error: '不支持的头像配色方案' });
      return true;
    }
    if (nextInitials !== undefined && (typeof nextInitials !== 'string' || nextInitials.trim().length > 4)) {
      send(res, 400, { error: '头像缩写最多支持4个字符' });
      return true;
    }
    if (nextUrl !== undefined && nextUrl !== null) {
      if (typeof nextUrl !== 'string' || nextUrl.length > 96000 || !DATA_IMAGE_URL_RE.test(nextUrl)) {
        send(res, 400, { error: '头像图片格式无效或体积过大' });
        return true;
      }
    }
    if (nextTitle !== undefined && (typeof nextTitle !== 'string' || nextTitle.trim().length > 120)) {
      send(res, 400, { error: '岗位与头衔长度不能超过120字' });
      return true;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: currentRows } = await client.query(
        `SELECT u.display_name, u.username, r.name AS role_name, up.title, up.avatar_initials, up.avatar_url, up.avatar_color_preset, up.theme_key
         FROM identity.users u
         LEFT JOIN identity.user_access a ON a.user_id = u.id
         LEFT JOIN identity.roles r ON r.id = a.role_id
         LEFT JOIN identity.user_profiles up ON up.user_id = u.id
         WHERE u.id = $1`,
        [user.id]
      );
      if (!currentRows.length) {
        await client.query('ROLLBACK');
        send(res, 404, { error: 'Not found' });
        return true;
      }

      const current = currentRows[0];
      const defaultInitials =
        normalizeText(current.display_name, 4).slice(0, 1) ||
        normalizeText(current.username, 2).slice(0, 1).toUpperCase();

      const resolvedTitle =
        nextTitle !== undefined
          ? normalizeText(nextTitle, 120) || current.role_name || '系统成员'
          : current.title || current.role_name || '系统成员';

      const resolvedInitials =
        nextInitials !== undefined
          ? normalizeText(nextInitials, 4).slice(0, 2) || defaultInitials
          : current.avatar_initials || defaultInitials;

      const resolvedPreset = nextPreset ?? current.avatar_color_preset ?? 'charcoal';
      const resolvedUrl = nextUrl === undefined ? current.avatar_url : nextUrl;
      const resolvedTheme = nextTheme ?? current.theme_key ?? 'lime_charcoal';

      const { rows: updatedRows } = await client.query(
        `INSERT INTO identity.user_profiles (
           user_id, title, avatar_initials, avatar_url, avatar_color_preset, theme_key, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (user_id) DO UPDATE SET
           title = EXCLUDED.title,
           avatar_initials = EXCLUDED.avatar_initials,
           avatar_url = EXCLUDED.avatar_url,
           avatar_color_preset = EXCLUDED.avatar_color_preset,
           theme_key = EXCLUDED.theme_key,
           updated_at = now()
         RETURNING title, avatar_initials, avatar_url, avatar_color_preset, theme_key, updated_at`,
        [user.id, resolvedTitle, resolvedInitials, resolvedUrl, resolvedPreset, resolvedTheme]
      );

      const actionLabel = nextTheme !== undefined && nextUrl === undefined && nextPreset === undefined && nextInitials === undefined
        ? '切换系统主题色'
        : '更新个人资料与主题偏好';

      const logDetails = {
        themeKey: resolvedTheme,
        avatarColorPreset: resolvedPreset,
        hasCustomAvatar: Boolean(resolvedUrl),
      };

      await client.query(
        `INSERT INTO identity.operation_log(actor_user_id, actor_role_id, actor_role_name, category, action, target, details, ip_address)
         SELECT $1, a.role_id, r.name, '个人设置', $2, u.username, $3::jsonb, $4
         FROM identity.users u
         LEFT JOIN identity.user_access a ON a.user_id = u.id
         LEFT JOIN identity.roles r ON r.id = a.role_id
         WHERE u.id = $1`,
        [user.id, actionLabel, JSON.stringify(logDetails), clientIp ? clientIp(req) : null]
      );

      await client.query('COMMIT');
      send(res, 200, { profile: updatedRows[0] });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  send(res, 405, { error: 'Method not allowed' });
  return true;
}
