BEGIN;
CREATE SCHEMA IF NOT EXISTS pricing;
CREATE TABLE pricing.categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id text NOT NULL,
 name varchar(120) NOT NULL CHECK(length(btrim(name))>0), sort_order integer NOT NULL DEFAULT 1 CHECK(sort_order BETWEEN 0 AND 999999),
 read_only boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,store_id)
);
CREATE UNIQUE INDEX pricing_categories_name_unique ON pricing.categories(store_id,lower(btrim(name)));
CREATE INDEX pricing_categories_order ON pricing.categories(store_id,sort_order,id);
CREATE TABLE pricing.items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_id text NOT NULL, category_id uuid NOT NULL,
 name varchar(180) NOT NULL CHECK(length(btrim(name))>0), cost_price numeric(12,2) NOT NULL DEFAULT 0 CHECK(cost_price>=0),
 retail_price numeric(12,2) NOT NULL DEFAULT 0 CHECK(retail_price>=0), enabled boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL DEFAULT 1 CHECK(sort_order BETWEEN 0 AND 999999), version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(category_id,store_id) REFERENCES pricing.categories(id,store_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX pricing_items_name_unique ON pricing.items(store_id,category_id,lower(btrim(name)));
CREATE INDEX pricing_items_order ON pricing.items(store_id,sort_order,id);
CREATE INDEX pricing_items_category ON pricing.items(category_id,store_id);
UPDATE identity.roles SET permissions=(SELECT array_agg(DISTINCT code) FROM unnest(permissions || ARRAY['basic.fee.read','basic.fee.create','basic.fee.update','basic.fee.delete']) code) WHERE identity_type='admin';
COMMIT;
