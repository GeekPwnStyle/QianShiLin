BEGIN;

CREATE SCHEMA IF NOT EXISTS catalog;

CREATE TABLE IF NOT EXISTS catalog.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES catalog.product_categories(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_readonly boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_category_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS product_categories_parent_sort_idx
  ON catalog.product_categories (parent_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS catalog.product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(60) NOT NULL,
  color varchar(24) NOT NULL DEFAULT 'default',
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  remark varchar(200) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_tag_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS product_tags_name_unique
  ON catalog.product_tags (lower(name));

CREATE TABLE IF NOT EXISTS catalog.product_dictionaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dict_type varchar(40) NOT NULL CHECK (dict_type IN ('stock_location', 'manufacturer', 'unit')),
  name varchar(120) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_dict_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS product_dict_type_name_unique
  ON catalog.product_dictionaries (dict_type, lower(name));

CREATE TABLE IF NOT EXISTS catalog.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code varchar(64) NOT NULL UNIQUE,
  name varchar(240) NOT NULL,
  brand_id uuid REFERENCES catalog.brands(id) ON DELETE SET NULL,
  brand_name varchar(120) NOT NULL DEFAULT '',
  category_id uuid REFERENCES catalog.product_categories(id) ON DELETE SET NULL,
  category_name varchar(120) NOT NULL DEFAULT '',
  model varchar(120) NOT NULL DEFAULT '',
  color_or_diopter varchar(120) NOT NULL DEFAULT '',
  series varchar(120) NOT NULL DEFAULT '',
  year integer,
  refractive_index varchar(32) NOT NULL DEFAULT '',
  is_custom_lens boolean NOT NULL DEFAULT false,
  axis varchar(40) NOT NULL DEFAULT '',
  coating_type varchar(80) NOT NULL DEFAULT '',
  contact_lens_type varchar(80) NOT NULL DEFAULT '',
  retail_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (retail_price >= 0),
  sales_discount numeric(6,2) NOT NULL DEFAULT 100.00 CHECK (sales_discount >= 0 AND sales_discount <= 1000),
  discounted_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (discounted_price >= 0),
  cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  wholesale_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (wholesale_price >= 0),
  barcode varchar(80) NOT NULL DEFAULT '',
  stock_location varchar(120) NOT NULL DEFAULT '',
  unit varchar(32) NOT NULL DEFAULT '',
  pin_on_sale boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  image_url text,
  supplier_id uuid REFERENCES catalog.suppliers(id) ON DELETE SET NULL,
  supplier_name varchar(180) NOT NULL DEFAULT '',
  min_stock integer,
  max_stock integer,
  manufacturer varchar(180) NOT NULL DEFAULT '',
  production_license_no varchar(120) NOT NULL DEFAULT '',
  filing_cert_no varchar(120) NOT NULL DEFAULT '',
  origin_place varchar(120) NOT NULL DEFAULT '',
  license_expires_on date,
  license_image_url text,
  store_id text NOT NULL DEFAULT 'store_hq_01',
  store_name varchar(120) NOT NULL DEFAULT '杭州西湖旗舰店',
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES identity.users(id),
  updated_by uuid REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_name_not_blank CHECK (length(btrim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS products_category_idx ON catalog.products (category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS products_brand_idx ON catalog.products (brand_name);
CREATE INDEX IF NOT EXISTS products_supplier_idx ON catalog.products (supplier_id);
CREATE INDEX IF NOT EXISTS products_enabled_pin_idx ON catalog.products (enabled, pin_on_sale DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS catalog.lens_surcharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL DEFAULT '散光附加费',
  surcharge_type varchar(40) NOT NULL DEFAULT '散光附加费',
  category_id uuid REFERENCES catalog.product_categories(id) ON DELETE SET NULL,
  category_name varchar(120) NOT NULL DEFAULT '全部',
  brand_id uuid REFERENCES catalog.brands(id) ON DELETE SET NULL,
  brand_name varchar(120) NOT NULL DEFAULT '全部',
  sph_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
  cyl_ranges jsonb NOT NULL DEFAULT '[]'::jsonb,
  matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirm_delete boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  remark varchar(300) NOT NULL DEFAULT '',
  created_by uuid REFERENCES identity.users(id),
  updated_by uuid REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
