-- Additional tables for Lesson Editor V2
-- This extends the schema from 01-schema.sql

-- Processed Content Outputs
-- Stores outputs from N8N workflows for use in lessons
CREATE TABLE IF NOT EXISTS processed_content_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content_source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES interaction_workflows(id) ON DELETE SET NULL,
  output_name VARCHAR(255) NOT NULL,
  output_type VARCHAR(50) NOT NULL, -- 'qa_pairs', 'summary', 'facts', 'chunks', 'concepts'
  output_data JSONB NOT NULL, -- The actual processed data
  workflow_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_processed_outputs_lesson ON processed_content_outputs(lesson_id);
CREATE INDEX idx_processed_outputs_type ON processed_content_outputs(output_type);

-- Script Blocks
-- Stores timeline script blocks for substages
CREATE TABLE IF NOT EXISTS script_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  substage_id VARCHAR(100) NOT NULL, -- e.g., "substage-1234567890"
  block_type VARCHAR(50) NOT NULL, -- 'teacher_talk', 'load_interaction', 'pause'
  content TEXT, -- Text for teacher_talk
  start_time INTEGER NOT NULL, -- Seconds from substage start
  end_time INTEGER NOT NULL, -- Seconds from substage start
  metadata JSONB, -- {interactionId: 'drag-drop-1', etc.}
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_script_blocks_lesson ON script_blocks(lesson_id);
CREATE INDEX idx_script_blocks_substage ON script_blocks(substage_id);
CREATE INDEX idx_script_blocks_sequence ON script_blocks(lesson_id, substage_id, sequence_order);

-- Updated_at triggers
CREATE TRIGGER update_processed_content_outputs_updated_at
BEFORE UPDATE ON processed_content_outputs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_script_blocks_updated_at
BEFORE UPDATE ON script_blocks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE processed_content_outputs IS 'Stores processed content outputs from N8N workflows for use in lesson substages';
COMMENT ON TABLE script_blocks IS 'Stores timeline script blocks (teacher talk, interactions, pauses) for lesson substages';

