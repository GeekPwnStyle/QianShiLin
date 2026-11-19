CREATE SCHEMA IF NOT EXISTS organization;
CREATE TABLE organization.stores(id text PRIMARY KEY, code text NOT NULL, profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object'));
CREATE UNIQUE INDEX organization_store_code ON organization.stores(lower(code));
CREATE TABLE organization.store_revision(id boolean PRIMARY KEY CHECK(id),revision integer NOT NULL DEFAULT 1);
INSERT INTO organization.store_revision(id) VALUES(true);
