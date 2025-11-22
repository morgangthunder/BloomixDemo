-- Fix Photosynthesis lesson true-false-selection interaction configuration
-- Add proper fragments and targetStatement to the embedded interaction config

UPDATE lessons
SET data = jsonb_set(
  data,
  '{structure,stages,0,subStages,0,interaction,config}',
  '{
    "fragments": [
      {
        "text": "Photosynthesis occurs in the chloroplasts",
        "isTrueInContext": true,
        "explanation": "Correct! Chloroplasts contain chlorophyll which captures light energy for photosynthesis."
      },
      {
        "text": "Plants produce oxygen during photosynthesis",
        "isTrueInContext": true,
        "explanation": "Correct! Oxygen is released as a byproduct when plants convert carbon dioxide and water into glucose."
      },
      {
        "text": "Photosynthesis requires sunlight",
        "isTrueInContext": true,
        "explanation": "Correct! Light energy from the sun drives the photosynthesis process."
      },
      {
        "text": "Water is not required for photosynthesis",
        "isTrueInContext": false,
        "explanation": "Incorrect. Water is a crucial reactant in photosynthesis, along with carbon dioxide."
      },
      {
        "text": "Plants can photosynthesize in complete darkness",
        "isTrueInContext": false,
        "explanation": "Incorrect. Light is essential for photosynthesis to occur - plants need sunlight to convert energy."
      },
      {
        "text": "Carbon dioxide is absorbed by plants during photosynthesis",
        "isTrueInContext": true,
        "explanation": "Correct! Plants take in carbon dioxide from the air through their leaves during photosynthesis."
      }
    ],
    "targetStatement": "Select all the TRUE statements about photosynthesis:",
    "maxFragments": 6,
    "showHints": false
  }'::jsonb
)
WHERE id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

-- Verify the update
SELECT 
  id,
  title,
  data->'structure'->'stages'->0->'subStages'->0->'interaction'->'type' as interaction_type,
  data->'structure'->'stages'->0->'subStages'->0->'interaction'->'config'->'targetStatement' as target_statement,
  jsonb_array_length(data->'structure'->'stages'->0->'subStages'->0->'interaction'->'config'->'fragments') as fragments_count
FROM lessons
WHERE id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

