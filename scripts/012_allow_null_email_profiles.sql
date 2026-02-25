-- Allow NULL email for profiles so admin can create accounts without email
-- Run this against your database: `psql -U beta -d beta -f 012_allow_null_email_profiles.sql`

ALTER TABLE profiles
  ALTER COLUMN email DROP NOT NULL;
