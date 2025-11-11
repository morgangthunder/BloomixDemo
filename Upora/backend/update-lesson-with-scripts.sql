-- Update the existing Photosynthesis lesson with scriptBlocks

UPDATE lessons
SET data = jsonb_set(
  jsonb_set(
    data,
    '{stages,0,subStages,0,scriptBlocks}',
    '[{
      "id": "script-1-1",
      "order": 0,
      "text": "Welcome to this lesson on Photosynthesis! Today we are going to explore one of the most important processes in nature. Have you ever wondered how plants make their own food? Let''s discover together how they convert sunlight into energy!",
      "estimatedDuration": 15,
      "audioUrl": null
    }]'::jsonb
  ),
  '{stages,0,subStages,1,scriptBlocks}',
  '[{
    "id": "script-1-2",
    "order": 0,
    "text": "Great work so far! Now let''s think about why photosynthesis matters. Without this amazing process, we wouldn''t have oxygen to breathe, and plants couldn''t grow the food we eat. It truly is one of nature''s greatest gifts!",
    "estimatedDuration": 12,
    "audioUrl": null
  }]'::jsonb
),
updated_at = NOW()
WHERE id = '30000000-0000-0000-0000-000000000099';

-- Verify the update
SELECT 
  id,
  title,
  jsonb_pretty(data->'stages'->0->'subStages'->0->'scriptBlocks') as first_script,
  jsonb_pretty(data->'stages'->0->'subStages'->1->'scriptBlocks') as second_script
FROM lessons
WHERE id = '30000000-0000-0000-0000-000000000099';

