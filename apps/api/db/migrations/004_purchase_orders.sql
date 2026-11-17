BEGIN;
CREATE SCHEMA IF NOT EXISTS purchase;
CREATE TABLE IF NOT EXISTS purchase.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  store_id text NOT NULL,
  supplier_id uuid REFERENCES catalog.suppliers(id),
  order_type text NOT NULL CHECK (order_type IN ('single','series')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','confirmed','received','cancelled')),
  hq_confirmed boolean NOT NULL DEFAULT false,
  order_date date NOT NULL,
  note text NOT NULL DEFAULT '',
  supplier_note text NOT NULL DEFAULT '',
  courier_info text NOT NULL DEFAULT '',
  source_order_no text NOT NULL DEFAULT '',
  related_purchase_no text NOT NULL DEFAULT '',
  supply_chain text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_orders_store_date_idx ON purchase.orders(store_id,created_at DESC);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_date_idx ON purchase.orders(supplier_id,created_at DESC);
CREATE TABLE IF NOT EXISTS purchase.order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES purchase.orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  category_name text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  series text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  ordered_qty integer NOT NULL CHECK (ordered_qty > 0),
  accepted_qty integer NOT NULL DEFAULT 0 CHECK (accepted_qty >= 0),
  note text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS purchase_order_lines_order_idx ON purchase.order_lines(order_id);
CREATE TABLE IF NOT EXISTS identity.user_purchase_scopes (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  store_ids text[] NOT NULL DEFAULT '{}',
  can_create boolean NOT NULL DEFAULT false
);
INSERT INTO identity.user_purchase_scopes(user_id,store_ids,can_create)
SELECT id, CASE username
  WHEN 'admin' THEN ARRAY['store_hq_01','store_hz_02','store_sh_03','store_nj_04']
  WHEN 'manager' THEN ARRAY['store_hq_01','store_hz_02']
  WHEN 'guide' THEN ARRAY['store_hz_02']
  WHEN 'optometrist' THEN ARRAY['store_hq_01']
  ELSE ARRAY[]::text[] END,
  username IN ('admin','manager')
FROM identity.users WHERE username IN ('admin','manager','guide','optometrist')
ON CONFLICT(user_id) DO NOTHING;
COMMIT;
