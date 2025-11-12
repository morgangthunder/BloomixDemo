-- Migration: Create lesson_drafts table for tracking lesson changes before approval
-- This allows lesson builders to save changes without affecting the live lesson
-- Only one draft per lesson is allowed

CREATE TABLE IF NOT EXISTS lesson_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL,
  
  -- Draft lesson data (full lesson JSON with changes)
  draft_data JSONB NOT NULL,
  
  -- Change summary
  change_summary TEXT,
  changes_count INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID,
  
  -- Ensure only one draft per lesson
  CONSTRAINT unique_lesson_draft UNIQUE (lesson_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_lesson_drafts_tenant ON lesson_drafts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lesson_drafts_status ON lesson_drafts(status);
CREATE INDEX IF NOT EXISTS idx_lesson_drafts_account ON lesson_drafts(account_id);
CREATE INDEX IF NOT EXISTS idx_lesson_drafts_lesson ON lesson_drafts(lesson_id);

COMMENT ON TABLE lesson_drafts IS 'Stores draft changes to lessons before they go live';
COMMENT ON COLUMN lesson_drafts.draft_data IS 'Full lesson data structure with changes';
COMMENT ON COLUMN lesson_drafts.change_summary IS 'Human-readable summary of what changed';

