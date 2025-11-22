-- Add conversation summary prompt for inventor assistant
-- This prompt is used to summarize conversation history when it exceeds the threshold

INSERT INTO ai_prompts (
  id,
  assistant_id,
  prompt_key,
  label,
  content,
  default_content,
  is_active
) VALUES (
  'inventor.conversation-summary',
  'inventor',
  'conversation-summary',
  'Conversation History Summary',
  'You are a helpful assistant that summarizes conversation history concisely while preserving important context.

Please provide a concise summary of the following conversation history. Focus on:
1. The main topics discussed
2. Key decisions or changes made
3. Important context that should be remembered
4. Any ongoing issues or problems being addressed

Keep the summary brief but comprehensive enough to maintain context for future messages.

Conversation history:
{conversation_history}',
  'You are a helpful assistant that summarizes conversation history concisely while preserving important context.

Please provide a concise summary of the following conversation history. Focus on:
1. The main topics discussed
2. Key decisions or changes made
3. Important context that should be remembered
4. Any ongoing issues or problems being addressed

Keep the summary brief but comprehensive enough to maintain context for future messages.

Conversation history:
{conversation_history}',
  true
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  content = EXCLUDED.content,
  default_content = EXCLUDED.default_content,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify the prompt was added
SELECT 
  id,
  assistant_id,
  prompt_key,
  label,
  CASE WHEN LENGTH(content) > 100 THEN LEFT(content, 100) || '...' ELSE content END as content_preview
FROM ai_prompts
WHERE assistant_id = 'inventor' AND prompt_key = 'conversation-summary';


