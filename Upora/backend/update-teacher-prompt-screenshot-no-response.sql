-- Update AI Teacher prompt: When requesting screenshot, show NO response until screenshot is processed
UPDATE ai_prompts
SET
  content = REPLACE(REPLACE(content,
    '**CRITICAL INSTRUCTIONS FOR [SCREENSHOT_REQUEST]:**
1. ALWAYS provide a helpful response to the student FIRST
2. NEVER mention screenshots, images, pictures, or asking to see their screen in your response text
3. Put [SCREENSHOT_REQUEST] at the VERY END of your response, after all your text
4. Example format: "Your answer here. [SCREENSHOT_REQUEST]"
5. If you need visual context, answer to the best of your ability first, then silently add [SCREENSHOT_REQUEST] at the end',
    '**CRITICAL INSTRUCTIONS FOR [SCREENSHOT_REQUEST]:**
1. If you need a screenshot to provide a proper answer, use ONLY [SCREENSHOT_REQUEST] - do NOT provide any text response
2. The system will automatically capture a screenshot and send it to you
3. After receiving the screenshot, you will be able to provide a proper response based on what you see
4. NEVER mention screenshots, images, pictures, or asking to see their screen in your response text
5. Example: If you need to see the screen, respond with just: "[SCREENSHOT_REQUEST]"
6. After the screenshot is processed, provide your full answer based on the visual context'),
    '**IMPORTANT: Always provide a response.** Even when you use [SCREENSHOT_REQUEST], you must still provide a helpful response to the student. The [SCREENSHOT_REQUEST] marker should be at the END of your response, after you have already answered their question to the best of your ability. If a screenshot would help you provide a better answer, include your best answer first, then add [SCREENSHOT_REQUEST] at the end.',
    '**IMPORTANT: When you use [SCREENSHOT_REQUEST], do NOT provide any text response. The system will capture a screenshot and send it to you, then you can provide a proper response based on what you see.'),
  default_content = REPLACE(REPLACE(default_content,
    '**CRITICAL INSTRUCTIONS FOR [SCREENSHOT_REQUEST]:**
1. ALWAYS provide a helpful response to the student FIRST
2. NEVER mention screenshots, images, pictures, or asking to see their screen in your response text
3. Put [SCREENSHOT_REQUEST] at the VERY END of your response, after all your text
4. Example format: "Your answer here. [SCREENSHOT_REQUEST]"
5. If you need visual context, answer to the best of your ability first, then silently add [SCREENSHOT_REQUEST] at the end',
    '**CRITICAL INSTRUCTIONS FOR [SCREENSHOT_REQUEST]:**
1. If you need a screenshot to provide a proper answer, use ONLY [SCREENSHOT_REQUEST] - do NOT provide any text response
2. The system will automatically capture a screenshot and send it to you
3. After receiving the screenshot, you will be able to provide a proper response based on what you see
4. NEVER mention screenshots, images, pictures, or asking to see their screen in your response text
5. Example: If you need to see the screen, respond with just: "[SCREENSHOT_REQUEST]"
6. After the screenshot is processed, provide your full answer based on the visual context'),
    '**IMPORTANT: Always provide a response.** Even when you use [SCREENSHOT_REQUEST], you must still provide a helpful response to the student. The [SCREENSHOT_REQUEST] marker should be at the END of your response, after you have already answered their question to the best of your ability. If a screenshot would help you provide a better answer, include your best answer first, then add [SCREENSHOT_REQUEST] at the end.',
    '**IMPORTANT: When you use [SCREENSHOT_REQUEST], do NOT provide any text response. The system will capture a screenshot and send it to you, then you can provide a proper response based on what you see.'),
  updated_at = NOW()
WHERE id = 'teacher.general';

