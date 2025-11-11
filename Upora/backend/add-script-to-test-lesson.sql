-- Add script blocks to the first substage of the Photosynthesis test lesson

UPDATE lessons
SET data = jsonb_set(
  data,
  '{stages,0,subStages,0,scriptBlocks}',
  '[{
    "id": "script-1",
    "order": 0,
    "text": "Welcome to this lesson on Photosynthesis! Today we''re going to explore one of the most important processes in nature - how plants convert sunlight into energy. Are you ready to discover the amazing world of photosynthesis?",
    "estimatedDuration": 15,
    "audioUrl": null
  }]'::jsonb
)
WHERE id = '30000000-0000-0000-0000-000000000099';

-- Verify the update
SELECT 
  id,
  title,
  jsonb_pretty(data->'stages'->0->'subStages'->0) as first_substage
FROM lessons
WHERE id = '30000000-0000-0000-0000-000000000099';

