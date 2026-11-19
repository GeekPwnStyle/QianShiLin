-- Run with psql ON_ERROR_STOP; CONCURRENTLY must remain outside a transaction.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS customer_profiles_store_created_id_idx
  ON customer.profiles(store_id,created_at DESC,id DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS customer_profiles_search_trgm_idx
  ON customer.profiles USING gin(name gin_trgm_ops,member_no gin_trgm_ops,phone gin_trgm_ops,guide_name gin_trgm_ops,medical_id_no gin_trgm_ops);
ANALYZE customer.profiles;
