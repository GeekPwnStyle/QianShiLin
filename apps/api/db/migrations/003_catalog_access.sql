BEGIN;
CREATE TABLE IF NOT EXISTS identity.user_catalog_access (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  role varchar(16) NOT NULL CHECK (role IN ('admin','store','supplier')),
  supplier_id uuid REFERENCES catalog.suppliers(id),
  CONSTRAINT supplier_scope_required CHECK (role <> 'supplier' OR supplier_id IS NOT NULL)
);
INSERT INTO identity.user_catalog_access (user_id,role)
SELECT id, 'admin' FROM identity.users WHERE username = 'admin'
ON CONFLICT (user_id) DO NOTHING;
INSERT INTO identity.user_catalog_access (user_id,role)
SELECT id, 'store' FROM identity.users WHERE username IN ('manager','guide','optometrist')
ON CONFLICT (user_id) DO NOTHING;
COMMIT;
