BEGIN;
CREATE TABLE IF NOT EXISTS customer.detail_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer.profiles(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('basic','vision','sales','history','repairs','referrals','health','extensions')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload)='object'),
  created_by uuid REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_detail_records_lookup ON customer.detail_records(customer_id,section,created_at DESC);
COMMIT;
