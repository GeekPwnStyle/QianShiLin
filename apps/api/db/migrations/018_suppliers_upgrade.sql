BEGIN;

ALTER TABLE catalog.suppliers
  ADD COLUMN IF NOT EXISTS alias_pinyin varchar(120) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS landline varchar(60) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wechat varchar(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS qq varchar(40) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_area_code varchar(60) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS business_license_image text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS device_license_image text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS device_license_issued_on date,
  ADD COLUMN IF NOT EXISTS device_license_issuer varchar(180) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS device_license_valid_from date,
  ADD COLUMN IF NOT EXISTS is_supply_chain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bound_franchise_stores text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS authorized_store_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS owner_store_type varchar(40) NOT NULL DEFAULT '总店',
  ADD COLUMN IF NOT EXISTS owner_store_name varchar(120) NOT NULL DEFAULT '杭州西湖旗舰店',
  ADD COLUMN IF NOT EXISTS bound_product_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS third_party_binding jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS suppliers_sort_order_idx
  ON catalog.suppliers (sort_order ASC, is_default DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS catalog.supplier_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code varchar(64) NOT NULL,
  status varchar(24) NOT NULL DEFAULT '待审核',
  target_store_name varchar(120) NOT NULL DEFAULT '',
  target_store_contact varchar(80) NOT NULL DEFAULT '',
  applied_at timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL DEFAULT '',
  supplier_id uuid REFERENCES catalog.suppliers(id) ON DELETE SET NULL,
  created_by uuid
);

CREATE INDEX IF NOT EXISTS supplier_invitations_applied_idx
  ON catalog.supplier_invitations (applied_at DESC);

COMMIT;
