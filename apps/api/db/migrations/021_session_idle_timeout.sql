BEGIN;
CREATE SCHEMA IF NOT EXISTS system;
CREATE TABLE IF NOT EXISTS system.session_policy (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 idle_timeout_minutes integer NOT NULL DEFAULT 30 CHECK(idle_timeout_minutes BETWEEN 1 AND 1440),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES identity.users(id)
);
INSERT INTO system.session_policy(id) VALUES(true) ON CONFLICT DO NOTHING;
ALTER TABLE identity.sessions ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();
COMMIT;
