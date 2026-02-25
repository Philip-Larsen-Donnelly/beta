-- Add campaign code and sequential bug numbers
-- Run with: docker compose exec -T db psql -U beta -d beta -f - < scripts/010_add_bug_numbers.sql

-- Campaign code (short prefix for bug references, e.g. "V43")
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS code TEXT;

-- Sequential bug number per campaign
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS bug_number INT;

-- Backfill existing bugs with sequential numbers per campaign
-- Bugs are numbered by creation order within their campaign
WITH numbered AS (
  SELECT b.id,
         ROW_NUMBER() OVER (
           PARTITION BY c.campaign_id
           ORDER BY b.created_at ASC
         )::int AS rn
  FROM bugs b
  JOIN components c ON c.id = b.component_id
)
UPDATE bugs SET bug_number = numbered.rn
FROM numbered
WHERE bugs.id = numbered.id;

-- Bugs with no component/campaign get global numbering
WITH numbered AS (
  SELECT b.id,
         ROW_NUMBER() OVER (ORDER BY b.created_at ASC)::int AS rn
  FROM bugs b
  LEFT JOIN components c ON c.id = b.component_id
  WHERE c.campaign_id IS NULL OR c.id IS NULL
)
UPDATE bugs SET bug_number = numbered.rn
FROM numbered
WHERE bugs.id = numbered.id AND bugs.bug_number IS NULL;
