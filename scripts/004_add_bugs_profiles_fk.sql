-- Add foreign key relationship between bugs.user_id and profiles.id
-- This allows Supabase to join bugs with profiles

ALTER TABLE bugs
ADD CONSTRAINT bugs_user_id_profiles_fk
FOREIGN KEY (user_id) REFERENCES profiles(id);
