-- Add processed content for true-false interaction
INSERT INTO processed_content_outputs (
  id,
  lesson_id,
  output_name,
  output_type,
  output_data,
  created_by
) VALUES (
  '40000000-0000-0000-0000-000000000099',
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  'Photosynthesis True/False',
  'true-false-selection',
  '{
    "statements": [
      {"id": 1, "text": "Plants need sunlight for photosynthesis", "isTrue": true},
      {"id": 2, "text": "Plants produce carbon dioxide during photosynthesis", "isTrue": false},
      {"id": 3, "text": "Photosynthesis produces oxygen", "isTrue": true},
      {"id": 4, "text": "Plants can photosynthesize in complete darkness", "isTrue": false},
      {"id": 5, "text": "Chlorophyll is the green pigment in plants", "isTrue": true},
      {"id": 6, "text": "Water is not needed for photosynthesis", "isTrue": false}
    ]
  }'::jsonb,
  '00000000-0000-0000-0000-000000000011'
) ON CONFLICT (id) DO UPDATE SET
  output_data = EXCLUDED.output_data,
  updated_at = NOW();

-- Update the lesson to include the interaction in the first substage
UPDATE lessons
SET data = jsonb_set(
  jsonb_set(
    data,
    '{stages,0,subStages,0,interaction}',
    '{
      "type": "true-false-selection",
      "contentOutputId": "40000000-0000-0000-0000-000000000099",
      "config": {
        "title": "Test Your Understanding",
        "instructions": "Select all the TRUE statements about photosynthesis"
      }
    }'::jsonb
  ),
  '{stages,0,subStages,0,contentOutputId}',
  '"40000000-0000-0000-0000-000000000099"'::jsonb
)
WHERE id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

