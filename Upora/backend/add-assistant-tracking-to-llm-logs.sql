-- Add assistant tracking to LLM generation logs
-- This allows us to track which AI assistant generated each request

ALTER TABLE llm_generation_logs 
ADD COLUMN IF NOT EXISTS assistant_id VARCHAR(100);

-- Add an index for faster queries
CREATE INDEX IF NOT EXISTS idx_llm_logs_assistant_id ON llm_generation_logs(assistant_id);

-- Add an index for querying by user + assistant
CREATE INDEX IF NOT EXISTS idx_llm_logs_user_assistant ON llm_generation_logs(user_id, assistant_id);

-- Add an index for querying by tenant + assistant
CREATE INDEX IF NOT EXISTS idx_llm_logs_tenant_assistant ON llm_generation_logs(tenant_id, assistant_id);

COMMENT ON COLUMN llm_generation_logs.assistant_id IS 'ID of the AI assistant that made this request (e.g., inventor, auto-populator, content-analyzer, ai-interaction-handler)';

