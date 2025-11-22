-- Add Screenshot Criteria prompt for AI Teacher assistant
INSERT INTO ai_prompts (
  id,
  assistant_id,
  prompt_key,
  label,
  content,
  default_content,
  is_active
) VALUES (
  'teacher.screenshot-criteria',
  'teacher',
  'screenshot-criteria',
  'Screenshot Request Criteria',
  'You should request a screenshot of the lesson-view area when:

1. **Visual Context Needed**: The student''s question relates to something visual on the screen (e.g., "What does this graph show?", "I don''t understand this diagram", "What is this button for?")

2. **Interaction Issues**: The student mentions problems with interactions, buttons, or UI elements (e.g., "This button isn''t working", "I can''t see the answer", "The interaction looks broken")

3. **Layout/Display Questions**: Questions about how content is displayed, positioned, or organized (e.g., "Where is the next button?", "I can''t find the explanation", "What should I be looking at?")

4. **Progress/State Questions**: Questions about their current position in the lesson, what stage they''re on, or what they should be doing next (e.g., "What should I do now?", "Am I on the right track?", "What comes next?")

5. **Unclear Context**: When the student''s question is vague or you need to see what they''re actually looking at to provide accurate help

**Do NOT request a screenshot when:**
- The question is purely conceptual or theoretical
- The question is about general lesson content that doesn''t require visual context
- The question is about something clearly described in text
- You already have enough context from the lesson data and conversation history

**How to Request:**
If you determine a screenshot would help, include `[SCREENSHOT_REQUEST]` in your response. After the screenshot is provided, analyze it and give your final answer.',
  'You should request a screenshot of the lesson-view area when:

1. **Visual Context Needed**: The student''s question relates to something visual on the screen (e.g., "What does this graph show?", "I don''t understand this diagram", "What is this button for?")

2. **Interaction Issues**: The student mentions problems with interactions, buttons, or UI elements (e.g., "This button isn''t working", "I can''t see the answer", "The interaction looks broken")

3. **Layout/Display Questions**: Questions about how content is displayed, positioned, or organized (e.g., "Where is the next button?", "I can''t find the explanation", "What should I be looking at?")

4. **Progress/State Questions**: Questions about their current position in the lesson, what stage they''re on, or what they should be doing next (e.g., "What should I do now?", "Am I on the right track?", "What comes next?")

5. **Unclear Context**: When the student''s question is vague or you need to see what they''re actually looking at to provide accurate help

**Do NOT request a screenshot when:**
- The question is purely conceptual or theoretical
- The question is about general lesson content that doesn''t require visual context
- The question is about something clearly described in text
- You already have enough context from the lesson data and conversation history

**How to Request:**
If you determine a screenshot would help, include `[SCREENSHOT_REQUEST]` in your response. After the screenshot is provided, analyze it and give your final answer.',
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
WHERE assistant_id = 'teacher' AND prompt_key = 'screenshot-criteria';


