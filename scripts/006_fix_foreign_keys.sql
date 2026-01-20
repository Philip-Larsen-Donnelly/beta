-- First, ensure the mock user profile exists
INSERT INTO profiles (id, display_name, email, is_admin)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev User', 'dev@example.com', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing foreign key constraints that reference auth.users
ALTER TABLE bugs DROP CONSTRAINT IF EXISTS bugs_user_id_fkey;
ALTER TABLE user_component_status DROP CONSTRAINT IF EXISTS user_component_status_user_id_fkey;

-- Add new foreign key constraints that reference profiles instead
ALTER TABLE bugs 
ADD CONSTRAINT bugs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE user_component_status 
ADD CONSTRAINT user_component_status_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
