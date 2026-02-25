-- Add is_hisp and force_password_change columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_hisp boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS force_password_change boolean DEFAULT false NOT NULL;
