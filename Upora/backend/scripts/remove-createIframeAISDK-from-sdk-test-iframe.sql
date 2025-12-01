-- Remove createIframeAISDK declaration from sdk-test-iframe JavaScript code
-- The wrapper already provides this function, so the builder's code should just call it

UPDATE interaction_types
SET js_code = REGEXP_REPLACE(
  js_code,
  'const createIframeAISDK = \(\) => \{[\s\S]*?\n    \};',
  '',
  'g'
)
WHERE id = 'sdk-test-iframe';

-- Verify the removal
SELECT 
  js_code LIKE '%const createIframeAISDK%' as still_has_const,
  js_code LIKE '%createIframeAISDK()%' as has_call,
  LENGTH(js_code) as new_length
FROM interaction_types 
WHERE id = 'sdk-test-iframe';

