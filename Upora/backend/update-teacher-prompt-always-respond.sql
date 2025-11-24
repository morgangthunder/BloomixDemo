-- Update AI Teacher prompt to always provide a response, even when requesting screenshots
UPDATE ai_prompts
SET
  content = content || E'\n\n**IMPORTANT: Always provide a response.** Even when you use [SCREENSHOT_REQUEST], you must still provide a helpful response to the student. The [SCREENSHOT_REQUEST] marker should be at the END of your response, after you have already answered their question to the best of your ability. If a screenshot would help you provide a better answer, include your best answer first, then add [SCREENSHOT_REQUEST] at the end.',
  default_content = default_content || E'\n\n**IMPORTANT: Always provide a response.** Even when you use [SCREENSHOT_REQUEST], you must still provide a helpful response to the student. The [SCREENSHOT_REQUEST] marker should be at the END of your response, after you have already answered their question to the best of your ability. If a screenshot would help you provide a better answer, include your best answer first, then add [SCREENSHOT_REQUEST] at the end.',
  updated_at = NOW()
WHERE id = 'teacher.general';

