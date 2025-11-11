-- ========================================
-- Test Data Setup for E2E Testing
-- True/False Selection Interaction
-- ========================================

-- 1. Ensure True/False Selection interaction type exists
INSERT INTO interaction_types (
  id,
  name,
  description,
  category,
  input_schema,
  config_schema,
  pixi_js_code,
  status,
  created_by,
  generation_prompt
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'True/False Selection',
  'Students select all true statements from a set of fragments',
  'TEASE',
  '{"fragments": [{"text": "string", "isTrueInContext": "boolean", "explanation": "string"}], "targetStatement": "string", "maxFragments": "number"}',
  '{"maxFragments": 10}',
  'HTML/CSS component',
  'approved',
  '00000000-0000-0000-0000-000000000011',
  'Given content, generate true/false statements for student selection...'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create a test lesson "Photosynthesis Basics" with True/False Selection
INSERT INTO lessons (
  id,
  tenant_id,
  title,
  description,
  thumbnail_url,
  category,
  difficulty,
  duration_minutes,
  tags,
  data,
  status,
  created_by,
  objectives
) VALUES (
  '30000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000001',
  'Photosynthesis Basics',
  'Learn how plants convert sunlight into energy',
  'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=300',
  'Science',
  'Beginner',
  15,
  ARRAY['biology', 'science', 'plants'],
  '{
    "stages": [
      {
        "id": "stage-1",
        "type": "tease",
        "title": "Understanding Photosynthesis",
        "order": 0,
        "duration": 10,
        "description": "Hook students with interesting facts about photosynthesis",
        "aiPrompt": "You are teaching photosynthesis. Help students understand the process.",
        "subStages": [
          {
            "id": "substage-1-1",
            "title": "What is Photosynthesis?",
            "order": 0,
            "content": "Photosynthesis is the process by which plants use sunlight to convert carbon dioxide and water into glucose (food) and oxygen.",
            "interactionTypeId": "20000000-0000-0000-0000-000000000001",
            "contentOutputId": "40000000-0000-0000-0000-000000000099"
          },
          {
            "id": "substage-1-2",
            "title": "Why is it Important?",
            "order": 1,
            "content": "Photosynthesis provides oxygen for us to breathe and food for the plant. It is essential for life on Earth!",
            "interactionTypeId": null,
            "contentOutputId": null
          }
        ],
        "prerequisites": []
      }
    ],
    "metadata": {
      "version": "1.0",
      "created": "2025-11-11T12:00:00.000Z",
      "updated": "2025-11-11T12:00:00.000Z"
    }
  }'::jsonb,
  'approved',
  '00000000-0000-0000-0000-000000000011',
  '{
    "learningObjectives": [
      "Understand what photosynthesis is",
      "Identify the inputs and outputs of photosynthesis",
      "Explain why photosynthesis is important"
    ],
    "topics": ["photosynthesis", "plants", "energy"]
  }'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  data = EXCLUDED.data,
  objectives = EXCLUDED.objectives,
  updated_at = NOW();

-- 3. Create processed content output with True/False Selection data
INSERT INTO processed_content_outputs (
  id,
  lesson_id,
  content_source_id,
  workflow_id,
  output_name,
  output_type,
  output_data,
  workflow_name,
  interaction_type_id,
  status,
  confidence_score,
  created_by
) VALUES (
  '40000000-0000-0000-0000-000000000099',
  '30000000-0000-0000-0000-000000000099',
  NULL,
  NULL,
  'Photosynthesis True/False Quiz',
  'true-false-selection',
  '{
    "interactionTypeId": "20000000-0000-0000-0000-000000000001",
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
  '20000000-0000-0000-0000-000000000001',
  'approved',
  0.95,
  '00000000-0000-0000-0000-000000000011'
) ON CONFLICT (id) DO UPDATE SET
  output_data = EXCLUDED.output_data,
  updated_at = NOW();

-- Verification queries (optional - comment out if not needed)
SELECT 
  'Lesson created:' as status,
  id, 
  title, 
  status,
  (data->'stages'->0->'subStages'->0->>'interactionTypeId') as interaction_type_id
FROM lessons 
WHERE id = '30000000-0000-0000-0000-000000000099';

SELECT 
  'Processed content created:' as status,
  id, 
  output_name, 
  output_type,
  interaction_type_id,
  status
FROM processed_content_outputs 
WHERE id = '40000000-0000-0000-0000-000000000099';

