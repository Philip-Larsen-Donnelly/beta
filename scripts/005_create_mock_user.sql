-- Create a mock user profile for development (bypassing auth)
-- This allows us to test functionality without actual authentication

-- First, insert a mock profile (this will work because we're using service role)
INSERT INTO profiles (id, email, display_name, is_admin)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@example.com',
  'Dev User',
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = 'Dev User',
  is_admin = true;

-- Drop existing foreign key constraints that reference auth.users
ALTER TABLE user_component_status 
DROP CONSTRAINT IF EXISTS user_component_status_user_id_fkey;

ALTER TABLE bugs 
DROP CONSTRAINT IF EXISTS bugs_user_id_fkey;

-- Re-add foreign key constraints to reference profiles instead
ALTER TABLE user_component_status
ADD CONSTRAINT user_component_status_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE bugs
ADD CONSTRAINT bugs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
