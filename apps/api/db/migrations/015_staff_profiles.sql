CREATE SCHEMA IF NOT EXISTS staff;
CREATE TABLE IF NOT EXISTS staff.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  source_id uuid,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  UNIQUE (store_id, source_id)
);
CREATE INDEX IF NOT EXISTS staff_profiles_store ON staff.profiles(store_id);
