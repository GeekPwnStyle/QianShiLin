BEGIN;
ALTER TABLE catalog.suppliers ADD COLUMN IF NOT EXISTS auto_provision_account boolean NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS catalog.legacy_supplier_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  username text NOT NULL CHECK (btrim(username) <> ''),
  legacy_role text NOT NULL,
  legacy_status text NOT NULL,
  phone text,
  legacy_created_at text,
  legacy_updated_at text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, username)
);
CREATE TABLE IF NOT EXISTS catalog.legacy_supplier_account_grants (
  account_id uuid NOT NULL REFERENCES catalog.legacy_supplier_accounts(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES catalog.suppliers(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  needs_review boolean NOT NULL DEFAULT false,
  PRIMARY KEY (account_id, supplier_id)
);
CREATE INDEX IF NOT EXISTS legacy_supplier_grants_supplier_idx
  ON catalog.legacy_supplier_account_grants(supplier_id);
COMMIT;
