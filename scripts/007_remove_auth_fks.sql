-- Remove foreign key constraints that reference auth.users
-- This allows development without authentication

-- First, check if the mock user exists in profiles, if not create it
INSERT INTO profiles (id, email, display_name, is_admin)
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@localhost', 'Dev User', true)
ON CONFLICT (id) DO NOTHING;

-- Drop all foreign key constraints on bugs table that reference auth.users
ALTER TABLE bugs DROP CONSTRAINT IF EXISTS bugs_user_id_fkey;

-- Drop all foreign key constraints on user_component_status table that reference auth.users
ALTER TABLE user_component_status DROP CONSTRAINT IF EXISTS user_component_status_user_id_fkey;

-- Add new foreign key constraints referencing profiles instead
ALTER TABLE bugs 
ADD CONSTRAINT bugs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE user_component_status 
ADD CONSTRAINT user_component_status_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
