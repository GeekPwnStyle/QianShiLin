BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(64) NOT NULL,
  display_name varchar(120) NOT NULL,
  email varchar(254),
  status varchar(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled', 'locked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CONSTRAINT users_username_not_blank CHECK (length(btrim(username)) > 0)
);
CREATE UNIQUE INDEX users_username_unique ON identity.users (lower(username));
CREATE UNIQUE INDEX users_email_unique ON identity.users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE identity.password_credentials (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_algorithm varchar(32) NOT NULL DEFAULT 'argon2id'
    CHECK (password_algorithm IN ('argon2id', 'bcrypt')),
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  must_change_password boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  CONSTRAINT password_hash_not_blank CHECK (length(btrim(password_hash)) > 0)
);
COMMENT ON TABLE identity.users IS 'Stable user identity for future foreign keys; role and organization mappings will be modeled separately.';
COMMENT ON TABLE identity.password_credentials IS 'Password verifier only; never store plaintext or reversible encryption.';
CREATE TABLE identity.login_aliases (
  alias varchar(254) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE
);
CREATE TABLE identity.sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON identity.sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON identity.sessions(expires_at);
COMMIT;
