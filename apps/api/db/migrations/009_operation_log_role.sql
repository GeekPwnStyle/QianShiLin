BEGIN;
ALTER TABLE identity.operation_log ADD COLUMN IF NOT EXISTS actor_role_id text;
ALTER TABLE identity.operation_log ADD COLUMN IF NOT EXISTS actor_role_name text;
UPDATE identity.operation_log l SET actor_role_id=a.role_id,actor_role_name=r.name
FROM identity.user_access a JOIN identity.roles r ON r.id=a.role_id
WHERE l.actor_user_id=a.user_id AND l.actor_role_id IS NULL;
COMMIT;
