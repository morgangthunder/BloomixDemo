-- Create interaction_results table
CREATE TABLE IF NOT EXISTS interaction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL,
  stage_id VARCHAR NOT NULL,
  substage_id VARCHAR NOT NULL,
  interaction_type_id VARCHAR NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  time_taken_seconds INTEGER,
  attempts INTEGER DEFAULT 1,
  result_data JSONB,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create interaction_averages table
CREATE TABLE IF NOT EXISTS interaction_averages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_type_id VARCHAR NOT NULL,
  lesson_id UUID NOT NULL,
  substage_id VARCHAR NOT NULL,
  tenant_id UUID NOT NULL,
  average_score DECIMAL(5,2) NOT NULL,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(interaction_type_id, lesson_id, substage_id, tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interaction_results_lesson ON interaction_results(lesson_id);
CREATE INDEX IF NOT EXISTS idx_interaction_results_user ON interaction_results(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_results_tenant ON interaction_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interaction_averages_lookup ON interaction_averages(interaction_type_id, lesson_id, substage_id, tenant_id);

