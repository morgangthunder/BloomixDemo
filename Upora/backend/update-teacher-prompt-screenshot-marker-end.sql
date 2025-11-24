-- Update AI Teacher prompt to put [SCREENSHOT_REQUEST] at the END of responses
-- And to never mention screenshots in the response text
UPDATE ai_prompts
SET
  content = REPLACE(REPLACE(content, 
    '**IMPORTANT: Always provide a response.** Even when you use [SCREENSHOT_REQUEST], you must still provide a helpful response to the student. The [SCREENSHOT_REQUEST] marker should be at the END of your response, after you have already answered their question to the best of your ability. If a screenshot would help you provide a better answer, include your best answer first, then add [SCREENSHOT_REQUEST] at the end.',
    '**CRITICAL INSTRUCTIONS FOR [SCREENSHOT_REQUEST]:**
1. ALWAYS provide a helpful response to the student FIRST
2. NEVER mention screenshots, images, pictures, or asking to see their screen in your response text
3. Put [SCREENSHOT_REQUEST] at the VERY END of your response, after all your text
4. Example format: "Your answer here. [SCREENSHOT_REQUEST]"
5. If you need visual context, answer to the best of your ability first, then silently add [SCREENSHOT_REQUEST] at the end'),
    '**CRITICAL: NEVER mention screenshots in your responses.** If you need visual context, use [SCREENSHOT_REQUEST] silently. The system will automatically capture and send a screenshot. You will then receive the screenshot and can respond with the camera emoji (📷) at the end of your response to indicate you used visual context.',
    '**CRITICAL: NEVER mention screenshots in your responses.** If you need visual context, use [SCREENSHOT_REQUEST] silently. The system will automatically capture and send a screenshot. You will then receive the screenshot and can respond with the camera emoji (📷) at the end of your response to indicate you used visual context.

**CRITICAL INSTRUCTIONS FOR [SCREENSHOT_REQUEST]:**
1. ALWAYS provide a helpful response to the student FIRST
2. NEVER mention screenshots, images, pictures, or asking to see their screen in your response text
3. Put [SCREENSHOT_REQUEST] at the VERY END of your response, after all your text
4. Example format: "Your answer here. [SCREENSHOT_REQUEST]"
5. If you need visual context, answer to the best of your ability first, then silently add [SCREENSHOT_REQUEST] at the end'),
  default_content = REPLACE(REPLACE(default_content,
    '**IMPORTANT: Always provide a response.** Even when you use [SCREENSHOT_REQUEST], you must still provide a helpful response to the student. The [SCREENSHOT_REQUEST] marker should be at the END of your response, after you have already answered their question to the best of your ability. If a screenshot would help you provide a better answer, include your best answer first, then add [SCREENSHOT_REQUEST] at the end.',
    '**CRITICAL INSTRUCTIONS FOR [SCREENSHOT_REQUEST]:**
1. ALWAYS provide a helpful response to the student FIRST
2. NEVER mention screenshots, images, pictures, or asking to see their screen in your response text
3. Put [SCREENSHOT_REQUEST] at the VERY END of your response, after all your text
4. Example format: "Your answer here. [SCREENSHOT_REQUEST]"
5. If you need visual context, answer to the best of your ability first, then silently add [SCREENSHOT_REQUEST] at the end'),
    '**CRITICAL: NEVER mention screenshots in your responses.** If you need visual context, use [SCREENSHOT_REQUEST] silently. The system will automatically capture and send a screenshot. You will then receive the screenshot and can respond with the camera emoji (📷) at the end of your response to indicate you used visual context.',
    '**CRITICAL: NEVER mention screenshots in your responses.** If you need visual context, use [SCREENSHOT_REQUEST] silently. The system will automatically capture and send a screenshot. You will then receive the screenshot and can respond with the camera emoji (📷) at the end of your response to indicate you used visual context.

**CRITICAL INSTRUCTIONS FOR [SCREENSHOT_REQUEST]:**
1. ALWAYS provide a helpful response to the student FIRST
2. NEVER mention screenshots, images, pictures, or asking to see their screen in your response text
3. Put [SCREENSHOT_REQUEST] at the VERY END of your response, after all your text
4. Example format: "Your answer here. [SCREENSHOT_REQUEST]"
5. If you need visual context, answer to the best of your ability first, then silently add [SCREENSHOT_REQUEST] at the end'),
  updated_at = NOW()
WHERE id = 'teacher.general';

