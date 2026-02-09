-- Create testpad_results table to store user results per step (local Postgres)
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
