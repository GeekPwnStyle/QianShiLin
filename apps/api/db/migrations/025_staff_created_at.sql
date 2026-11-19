BEGIN;
ALTER TABLE staff.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE staff.profiles ALTER COLUMN created_at SET DEFAULT now();
COMMIT;
