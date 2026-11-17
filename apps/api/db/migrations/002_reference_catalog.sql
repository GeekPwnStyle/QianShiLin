BEGIN;
CREATE SCHEMA IF NOT EXISTS catalog;

CREATE TABLE IF NOT EXISTS catalog.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  alias varchar(120) NOT NULL DEFAULT '',
  kind varchar(16) NOT NULL CHECK (kind IN ('自营品牌','代理品牌')),
  natures text[] NOT NULL DEFAULT '{}',
  series text[] NOT NULL DEFAULT '{}',
  remark text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS brands_name_unique ON catalog.brands (lower(name));
CREATE INDEX IF NOT EXISTS brands_enabled_order_idx ON catalog.brands (enabled, pinned DESC, name);

CREATE TABLE IF NOT EXISTS catalog.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  alias varchar(120) NOT NULL DEFAULT '',
  contact varchar(80) NOT NULL DEFAULT '',
  phone varchar(40) NOT NULL DEFAULT '',
  categories text[] NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  province varchar(80) NOT NULL DEFAULT '',
  city varchar(80) NOT NULL DEFAULT '',
  district varchar(80) NOT NULL DEFAULT '',
  detail_address text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT '',
  credit_code varchar(32) NOT NULL DEFAULT '',
  business_license_expires_on date,
  device_license_number varchar(100) NOT NULL DEFAULT '',
  device_license_expires_on date,
  bank_holder varchar(120) NOT NULL DEFAULT '',
  bank_branch varchar(180) NOT NULL DEFAULT '',
  bank_account varchar(100) NOT NULL DEFAULT '',
  remark text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS suppliers_name_idx ON catalog.suppliers (lower(name));
CREATE INDEX IF NOT EXISTS suppliers_enabled_idx ON catalog.suppliers (enabled, created_at DESC);
CREATE INDEX IF NOT EXISTS suppliers_credit_code_idx ON catalog.suppliers (credit_code) WHERE credit_code <> '';

CREATE TABLE IF NOT EXISTS catalog.supplier_brands (
  supplier_id uuid NOT NULL REFERENCES catalog.suppliers(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES catalog.brands(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, brand_id)
);
CREATE INDEX IF NOT EXISTS supplier_brands_brand_idx ON catalog.supplier_brands (brand_id);

CREATE TABLE IF NOT EXISTS catalog.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL,
  name varchar(120) NOT NULL,
  contact_phone varchar(40) NOT NULL DEFAULT '',
  warehouse_type varchar(40) NOT NULL,
  store_id uuid,
  remark text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT warehouse_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT warehouse_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS warehouses_code_unique ON catalog.warehouses (lower(code));
CREATE INDEX IF NOT EXISTS warehouses_store_order_idx ON catalog.warehouses (store_id, display_order, name);

COMMIT;
