BEGIN;
CREATE SCHEMA IF NOT EXISTS message;

CREATE TABLE IF NOT EXISTS message.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(160) NOT NULL CHECK (length(btrim(title)) > 0),
  category varchar(32) NOT NULL CHECK (category IN ('general','work','maintenance','policy')),
  severity varchar(16) NOT NULL CHECK (severity IN ('normal','important','urgent')),
  content text NOT NULL CHECK (length(btrim(content)) > 0 AND length(content) <= 20000),
  audience jsonb NOT NULL,
  publisher_user_id uuid NOT NULL REFERENCES identity.users(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message.announcement_receipts (
  announcement_id uuid NOT NULL REFERENCES message.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  recipient_role_id text NOT NULL,
  recipient_role_name text NOT NULL,
  recipient_store_ids text[] NOT NULL DEFAULT '{}',
  read_at timestamptz,
  PRIMARY KEY (announcement_id,user_id)
);
CREATE INDEX IF NOT EXISTS announcements_published_idx ON message.announcements(published_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS announcement_receipts_unread_idx ON message.announcement_receipts(user_id,announcement_id) WHERE read_at IS NULL;

UPDATE identity.roles SET permissions = array_append(permissions,'system.notice.publish')
WHERE identity_type='admin' AND permissions @> ARRAY['system.read']::text[]
  AND NOT permissions @> ARRAY['system.notice.publish']::text[];
COMMIT;
