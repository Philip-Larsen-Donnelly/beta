-- Add soft-delete/edit metadata to bug_comments for existing databases
ALTER TABLE bug_comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
