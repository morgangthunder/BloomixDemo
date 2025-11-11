-- Create interaction_results table (matching entity exactly)
CREATE TABLE IF NOT EXISTS interaction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  stage_id VARCHAR(100) NOT NULL,
  substage_id VARCHAR(100) NOT NULL,
  interaction_type_id VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  time_taken_seconds INTEGER,
  attempts INTEGER DEFAULT 1,
  result_data JSONB,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interaction_averages table
CREATE TABLE IF NOT EXISTS interaction_averages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_type_id VARCHAR(100) NOT NULL,
  lesson_id UUID NOT NULL,
  substage_id VARCHAR(100) NOT NULL,
  tenant_id UUID NOT NULL,
  average_score DECIMAL(5,2) NOT NULL,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(interaction_type_id, lesson_id, substage_id, tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interaction_results_student ON interaction_results(student_id);
CREATE INDEX IF NOT EXISTS idx_interaction_results_lesson ON interaction_results(lesson_id);
CREATE INDEX IF NOT EXISTS idx_interaction_results_tenant ON interaction_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interaction_averages_lookup ON interaction_averages(interaction_type_id, lesson_id, substage_id, tenant_id);

