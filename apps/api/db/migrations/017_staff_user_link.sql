ALTER TABLE staff.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS staff_profiles_user_idx ON staff.profiles(user_id);
