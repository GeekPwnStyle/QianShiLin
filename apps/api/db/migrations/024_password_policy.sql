BEGIN;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS is_system_admin boolean NOT NULL DEFAULT false;
UPDATE identity.users SET is_system_admin=true WHERE username='admin';
ALTER TABLE identity.password_credentials ALTER COLUMN must_change_password SET DEFAULT true;
COMMIT;
