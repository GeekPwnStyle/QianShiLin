BEGIN;
CREATE TABLE IF NOT EXISTS identity.roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  identity_type text NOT NULL CHECK (identity_type IN ('admin','store','supplier')),
  sub_role text,
  description text NOT NULL DEFAULT '',
  data_scope text NOT NULL CHECK (data_scope IN ('all_stores','assigned_stores','own_supplier')),
  permissions text[] NOT NULL DEFAULT '{}',
  sensitive_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'system'
);
CREATE TABLE IF NOT EXISTS identity.user_access (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES identity.roles(id),
  store_ids text[] NOT NULL DEFAULT '{}',
  permission_denies text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES identity.users(id)
);
CREATE INDEX IF NOT EXISTS user_access_role_idx ON identity.user_access(role_id);
CREATE TABLE IF NOT EXISTS identity.access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES identity.users(id),
  target_kind text NOT NULL CHECK (target_kind IN ('role','user')),
  target_id text NOT NULL,
  before_state jsonb,
  after_state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_audit_created_idx ON identity.access_audit(created_at DESC);
COMMIT;
