-- Create processed content output for True/False Selection interaction
INSERT INTO processed_content_outputs (
  id,
  lesson_id,
  content_source_id,
  workflow_id,
  output_name,
  output_type,
  output_data,
  workflow_name,
  notes,
  created_by
) VALUES (
  '40000000-0000-0000-0000-000000000099',
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  NULL,
  NULL,
  'Photosynthesis True/False Quiz',
  'true-false-selection',
  '{
    "interactionTypeId": "true-false-selection",
    "targetStatement": "About Photosynthesis",
    "maxFragments": 6,
    "fragments": [
      {
        "text": "Plants use sunlight to make food",
        "isTrueInContext": true,
        "explanation": "Correct! Plants convert sunlight into glucose through photosynthesis."
      },
      {
        "text": "Photosynthesis produces carbon dioxide",
        "isTrueInContext": false,
        "explanation": "Incorrect. Photosynthesis USES carbon dioxide and produces oxygen."
      },
      {
        "text": "Chlorophyll gives plants their green color",
        "isTrueInContext": true,
        "explanation": "Correct! Chlorophyll is the green pigment in plants that captures light energy."
      },
      {
        "text": "Plants only photosynthesize at night",
        "isTrueInContext": false,
        "explanation": "Incorrect. Plants photosynthesize during the day when sunlight is available."
      },
      {
        "text": "Water is needed for photosynthesis",
        "isTrueInContext": true,
        "explanation": "Correct! Water (H₂O) is one of the key inputs for photosynthesis."
      },
      {
        "text": "Photosynthesis occurs in animal cells",
        "isTrueInContext": false,
        "explanation": "Incorrect. Only plant cells (and some bacteria) can perform photosynthesis."
      }
    ]
  }'::jsonb,
  'Content Analyzer',
  'Test interaction for E2E flow',
  '00000000-0000-0000-0000-000000000011'
) ON CONFLICT (id) DO UPDATE SET
  output_data = EXCLUDED.output_data,
  updated_at = NOW();

-- Verify
SELECT id, output_name, output_type FROM processed_content_outputs WHERE id = '40000000-0000-0000-0000-000000000099';

