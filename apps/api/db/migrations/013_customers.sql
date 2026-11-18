BEGIN;

CREATE SCHEMA IF NOT EXISTS customer;

CREATE TABLE IF NOT EXISTS customer.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_no varchar(40) NOT NULL UNIQUE,
  name varchar(80) NOT NULL CHECK (length(btrim(name)) > 0),
  phone varchar(24) NOT NULL,
  gender varchar(8) NOT NULL DEFAULT '男' CHECK (gender IN ('男', '女')),
  birthday date,
  age integer NOT NULL DEFAULT 0 CHECK (age >= 0 AND age <= 150),
  age_group varchar(32) NOT NULL DEFAULT '',
  address varchar(120) NOT NULL DEFAULT '',
  remark varchar(400) NOT NULL DEFAULT '',
  tier varchar(32) NOT NULL DEFAULT '普通顾客',
  avatar_url text,
  medical_id_no varchar(64) NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  store_id text NOT NULL,
  store_name varchar(120) NOT NULL DEFAULT '',
  guide_name varchar(80) NOT NULL DEFAULT '',
  source varchar(40) NOT NULL DEFAULT '门店新建',
  related_account varchar(80) NOT NULL DEFAULT '',
  customer_type varchar(40) NOT NULL DEFAULT '普通客群',
  wechat_followed boolean NOT NULL DEFAULT false,
  refundable_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (refundable_amount >= 0),
  stored_value_balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (stored_value_balance >= 0),
  points_balance integer NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  visit_count integer NOT NULL DEFAULT 1 CHECK (visit_count >= 0),
  last_visit_date date DEFAULT CURRENT_DATE,
  next_review_date date,
  created_by uuid REFERENCES identity.users(id),
  updated_by uuid REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_profiles_store_created_idx
  ON customer.profiles (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_profiles_phone_idx
  ON customer.profiles (phone);
CREATE INDEX IF NOT EXISTS customer_profiles_name_idx
  ON customer.profiles (lower(name));

CREATE TABLE IF NOT EXISTS customer.tag_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(40) NOT NULL CHECK (length(btrim(name)) > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_tag_definitions_name_unique
  ON customer.tag_definitions (lower(name));

INSERT INTO customer.tag_definitions (name, sort_order) VALUES
  ('高度近视', 10),
  ('青少年防控', 20),
  ('渐进多焦点', 30),
  ('隐形眼镜常客', 40),
  ('VIP复购', 50),
  ('太阳镜偏好', 60),
  ('老花镜需求', 70)
ON CONFLICT DO NOTHING;

-- Grant customer create/update/delete permissions to roles that manage customer archives
UPDATE identity.roles
SET permissions = array_append(permissions, 'basic.customer.create')
WHERE permissions @> ARRAY['basic.customer.read']::text[]
  AND NOT permissions @> ARRAY['basic.customer.create']::text[];

UPDATE identity.roles
SET permissions = array_append(permissions, 'basic.customer.update')
WHERE permissions @> ARRAY['basic.customer.read']::text[]
  AND NOT permissions @> ARRAY['basic.customer.update']::text[];

UPDATE identity.roles
SET permissions = array_append(permissions, 'basic.customer.delete')
WHERE id IN ('role_hq_admin', 'role_store_manager')
  AND NOT permissions @> ARRAY['basic.customer.delete']::text[];

COMMIT;
