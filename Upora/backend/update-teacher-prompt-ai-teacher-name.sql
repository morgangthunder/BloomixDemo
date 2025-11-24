-- Update AI Teacher General Prompt to use "AI Teacher" instead of "AI Assistant"
UPDATE ai_prompts
SET
  content = REPLACE(REPLACE(REPLACE(content, 'AI Assistant', 'AI Teacher'), 'AI assistant', 'AI Teacher'), 'assistant', 'AI Teacher'),
  default_content = REPLACE(REPLACE(REPLACE(default_content, 'AI Assistant', 'AI Teacher'), 'AI assistant', 'AI Teacher'), 'assistant', 'AI Teacher'),
  updated_at = NOW()
WHERE id = 'teacher.general';

-- Also update screenshot criteria prompt
UPDATE ai_prompts
SET
  content = REPLACE(REPLACE(REPLACE(content, 'AI Assistant', 'AI Teacher'), 'AI assistant', 'AI Teacher'), 'assistant', 'AI Teacher'),
  default_content = REPLACE(REPLACE(REPLACE(default_content, 'AI Assistant', 'AI Teacher'), 'AI assistant', 'AI Teacher'), 'assistant', 'AI Teacher'),
  updated_at = NOW()
WHERE id = 'teacher.screenshot-criteria';

-- Update iframe screenshot prompt
UPDATE ai_prompts
SET
  content = REPLACE(REPLACE(REPLACE(content, 'AI Assistant', 'AI Teacher'), 'AI assistant', 'AI Teacher'), 'assistant', 'AI Teacher'),
  default_content = REPLACE(REPLACE(REPLACE(default_content, 'AI Assistant', 'AI Teacher'), 'AI assistant', 'AI Teacher'), 'assistant', 'AI Teacher'),
  updated_at = NOW()
WHERE id = 'teacher.iframe-screenshot';

