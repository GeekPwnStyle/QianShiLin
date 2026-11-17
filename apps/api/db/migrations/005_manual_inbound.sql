BEGIN;
CREATE TABLE IF NOT EXISTS purchase.manual_inbound_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_no text NOT NULL UNIQUE,
  store_id text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES catalog.suppliers(id),
  business_date date NOT NULL,
  expected_receipt_date date,
  settlement_type text NOT NULL CHECK (settlement_type IN ('store','headquarters')),
  external_order_no text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  supplier_note text NOT NULL DEFAULT '',
  freight numeric(14,2) NOT NULL DEFAULT 0 CHECK (freight >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),
  created_by uuid NOT NULL REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS manual_inbound_drafts_store_created_idx
  ON purchase.manual_inbound_drafts(store_id,created_at DESC);
CREATE TABLE IF NOT EXISTS purchase.manual_inbound_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES purchase.manual_inbound_drafts(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  category_name text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  series text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  purchase_price numeric(14,2) NOT NULL CHECK (purchase_price >= 0),
  retail_price numeric(14,2) NOT NULL CHECK (retail_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  note text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS manual_inbound_lines_draft_idx ON purchase.manual_inbound_lines(draft_id);
COMMIT;
