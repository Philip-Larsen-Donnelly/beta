-- Base schema for local Postgres (no Supabase dependencies)
-- Run with: psql "$DATABASE_URL" -f scripts/postgres-init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  organisation TEXT,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  guides_markdown TEXT,
  display_order INTEGER DEFAULT 0,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS component_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#16a34a',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS component_category_map (
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES component_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (component_id, category_id)
);

CREATE TABLE IF NOT EXISTS user_component_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  is_selected BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, component_id)
);

CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reported', 'closed', 'fixed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS component_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('testpad', 'markdown', 'video')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS testpad_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES component_resources(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id, step_index)
);

CREATE TABLE IF NOT EXISTS bug_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bug_votes (
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bug_id, user_id)
);

-- Dev seed user (matches MOCK_USER_ID used in UI)
INSERT INTO profiles (id, email, username, display_name, organisation, password_hash, is_admin)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@example.com',
  'dev',
  'Dev User',
  'Example Org',
  '$2a$10$CwTycUXWue0Thq9StjUM0uJ8d7p/8r7V6czS4fFqqTZYBFvToNi4.',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Seed initial campaign
INSERT INTO campaigns (id, name, description, start_date, end_date, details)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Default Campaign',
  'Initial testing campaign',
  NULL,
  NULL,
  '## Welcome

- Use this default campaign to organize components and bugs.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed initial components
INSERT INTO components (name, description, guides_markdown, display_order, campaign_id) VALUES
(
  'Login & Authentication',
  'Test user registration, login, logout, and session management',
  '## Testing Guidelines

### What to Test
- User registration flow
- Login with valid/invalid credentials
- Password reset functionality
- Session persistence
- Logout functionality

### Test Scenarios
1. Register a new user with valid email
2. Try to register with an existing email
3. Login with correct credentials
4. Login with wrong password
5. Check session after page refresh',
  1,
  '11111111-1111-1111-1111-111111111111'
),
(
  'Dashboard Overview',
  'Test the main dashboard and navigation components',
  '## Testing Guidelines

### What to Test
- Dashboard loads correctly
- Navigation works between sections
- Data displays properly
- Responsive design on mobile

### Test Scenarios
1. Navigate to dashboard after login
2. Check all navigation links work
3. Verify data accuracy
4. Test on different screen sizes',
  2,
  '11111111-1111-1111-1111-111111111111'
),
(
  'Bug Submission Form',
  'Test the bug reporting functionality',
  '## Testing Guidelines

### What to Test
- Form validation
- Required fields enforcement
- Severity/priority selection
- Submission success/failure handling

### Test Scenarios
1. Submit a bug with all fields filled
2. Try to submit with missing required fields
3. Test different severity levels
4. Verify bug appears in list after submission',
  3,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

