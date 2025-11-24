-- Fix AI Teacher prompt to use "AI Teacher" correctly (avoiding double replacement)
-- First, fix the general prompt
UPDATE ai_prompts
SET
  content = REPLACE(
    REPLACE(
      REPLACE(content, 'AI Assistant', 'AI Teacher'),
      'AI assistant', 'AI Teacher'
    ),
    'You are an AI Teacher AI Teacher', 'You are an AI Teacher'
  ),
  default_content = REPLACE(
    REPLACE(
      REPLACE(default_content, 'AI Assistant', 'AI Teacher'),
      'AI assistant', 'AI Teacher'
    ),
    'You are an AI Teacher AI Teacher', 'You are an AI Teacher'
  ),
  updated_at = NOW()
WHERE id = 'teacher.general';

-- Fix screenshot criteria prompt
UPDATE ai_prompts
SET
  content = REPLACE(
    REPLACE(
      REPLACE(content, 'AI Assistant', 'AI Teacher'),
      'AI assistant', 'AI Teacher'
    ),
    'You are an AI Teacher AI Teacher', 'You are an AI Teacher'
  ),
  default_content = REPLACE(
    REPLACE(
      REPLACE(default_content, 'AI Assistant', 'AI Teacher'),
      'AI assistant', 'AI Teacher'
    ),
    'You are an AI Teacher AI Teacher', 'You are an AI Teacher'
  ),
  updated_at = NOW()
WHERE id = 'teacher.screenshot-criteria';

-- Fix iframe screenshot prompt
UPDATE ai_prompts
SET
  content = REPLACE(
    REPLACE(
      REPLACE(content, 'AI Assistant', 'AI Teacher'),
      'AI assistant', 'AI Teacher'
    ),
    'You are an AI Teacher AI Teacher', 'You are an AI Teacher'
  ),
  default_content = REPLACE(
    REPLACE(
      REPLACE(default_content, 'AI Assistant', 'AI Teacher'),
      'AI assistant', 'AI Teacher'
    ),
    'You are an AI Teacher AI Teacher', 'You are an AI Teacher'
  ),
  updated_at = NOW()
WHERE id = 'teacher.iframe-screenshot';

