BEGIN;

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
      'rose_coral',
      'pure_white'
    )),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE identity.user_profiles IS 'Per-user profile attributes and personal system theme preferences editable by every authenticated user.';

-- Backfill email on identity.users from email-like login_aliases if not set
UPDATE identity.users u
SET email = la.alias,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (user_id) user_id, alias
  FROM identity.login_aliases
  WHERE alias LIKE '%@%'
  ORDER BY user_id, alias
) la
WHERE u.id = la.user_id
  AND u.email IS NULL;

-- Seed profile metadata for the 5 demo accounts without overriding user-customized theme/avatar
INSERT INTO identity.user_profiles (user_id, title, avatar_initials, avatar_color_preset, theme_key)
SELECT u.id, v.title, v.avatar_initials, 'charcoal', 'lime_charcoal'
FROM (
  VALUES
    ('admin', '营运总监 · 管理员', '林'),
    ('manager', '店长 · 杭州西湖旗舰店', '周'),
    ('guide', '导购员 · 杭州滨江天街店', '陈'),
    ('optometrist', '高级验光师 · 杭州西湖旗舰店', '许'),
    ('supplier', '供应链协调人 · 卡尔蔡司光学华东代理', '顾')
) AS v(username, title, avatar_initials)
JOIN identity.users u ON lower(u.username) = lower(v.username)
ON CONFLICT (user_id) DO UPDATE
SET title = CASE WHEN identity.user_profiles.title = '' THEN EXCLUDED.title ELSE identity.user_profiles.title END,
    avatar_initials = CASE WHEN identity.user_profiles.avatar_initials = '' THEN EXCLUDED.avatar_initials ELSE identity.user_profiles.avatar_initials END;

-- Ensure any other existing users in identity.users have a default profile row
INSERT INTO identity.user_profiles (user_id, title, avatar_initials, avatar_color_preset, theme_key)
SELECT u.id,
       COALESCE(r.name, '系统成员'),
       COALESCE(NULLIF(left(btrim(u.display_name), 1), ''), upper(left(u.username, 1))),
       'charcoal',
       'lime_charcoal'
FROM identity.users u
LEFT JOIN identity.user_access a ON a.user_id = u.id
LEFT JOIN identity.roles r ON r.id = a.role_id
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
