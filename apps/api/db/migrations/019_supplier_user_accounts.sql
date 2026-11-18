BEGIN;

ALTER TABLE catalog.suppliers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_user_id_unique
  ON catalog.suppliers (user_id)
  WHERE user_id IS NOT NULL;

COMMIT;
