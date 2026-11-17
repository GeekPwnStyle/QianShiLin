BEGIN;
CREATE TABLE IF NOT EXISTS identity.operation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES identity.users(id),
  category text NOT NULL,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  client_type text NOT NULL DEFAULT 'PC端',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operation_log_created_idx ON identity.operation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS operation_log_actor_created_idx ON identity.operation_log(actor_user_id,created_at DESC);
COMMIT;
