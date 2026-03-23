-- Create bug comments and votes (local Postgres)
CREATE TABLE IF NOT EXISTS bug_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bug_votes (
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bug_id, user_id)
);
