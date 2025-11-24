-- Update AI Teacher prompts to NEVER mention screenshots in responses
-- The AI should use [SCREENSHOT_REQUEST] silently and never tell the user about it
UPDATE ai_prompts
SET
  content = content || E'\n\n**CRITICAL: NEVER mention screenshots in your responses.** If you need visual context, use [SCREENSHOT_REQUEST] silently. The system will automatically capture and send a screenshot. You will then receive the screenshot and can respond with the camera emoji (📷) at the end of your response to indicate you used visual context.',
  default_content = default_content || E'\n\n**CRITICAL: NEVER mention screenshots in your responses.** If you need visual context, use [SCREENSHOT_REQUEST] silently. The system will automatically capture and send a screenshot. You will then receive the screenshot and can respond with the camera emoji (📷) at the end of your response to indicate you used visual context.',
  updated_at = NOW()
WHERE id = 'teacher.general';

