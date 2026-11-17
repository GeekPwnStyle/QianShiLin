BEGIN;

DO $$
DECLARE
  constraint_rec record;
  has_latest_check boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'identity'
      AND t.relname = 'user_profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%theme_key%'
      AND pg_get_constraintdef(c.oid) LIKE '%pure_white%'
  ) INTO has_latest_check;

  IF NOT has_latest_check THEN
    FOR constraint_rec IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'identity'
        AND t.relname = 'user_profiles'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) LIKE '%theme_key%'
    LOOP
      EXECUTE format('ALTER TABLE identity.user_profiles DROP CONSTRAINT %I', constraint_rec.conname);
    END LOOP;

    ALTER TABLE identity.user_profiles
      ADD CONSTRAINT user_profiles_theme_key_check
      CHECK (theme_key IN (
        'lime_charcoal',
        'emerald_mint',
        'azure_cobalt',
        'amber_bronze',
        'violet_plum',
        'rose_coral',
        'pure_white'
      ));
  END IF;
END $$;

COMMIT;
