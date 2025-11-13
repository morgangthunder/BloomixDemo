-- Update true-false-selection interaction with type and sample data
UPDATE interaction_types 
SET 
  interaction_type_category = 'pixijs',
  sample_data = '{
    "fragments": [
      {
        "text": "Photosynthesis occurs in the chloroplasts",
        "isTrueInContext": true,
        "explanation": "Correct! Chloroplasts contain chlorophyll which captures light energy."
      },
      {
        "text": "Plants only use carbon dioxide during the day",
        "isTrueInContext": true,
        "explanation": "Correct! Plants perform photosynthesis during daylight hours."
      },
      {
        "text": "Water is not required for photosynthesis",
        "isTrueInContext": false,
        "explanation": "Incorrect. Water is a crucial reactant in photosynthesis."
      },
      {
        "text": "Oxygen is a byproduct of photosynthesis",
        "isTrueInContext": true,
        "explanation": "Correct! Oxygen is released as plants convert CO2 and water to glucose."
      },
      {
        "text": "Photosynthesis requires sunlight",
        "isTrueInContext": true,
        "explanation": "Correct! Light energy drives the photosynthesis process."
      },
      {
        "text": "Plants can photosynthesize in complete darkness",
        "isTrueInContext": false,
        "explanation": "Incorrect. Light is essential for photosynthesis to occur."
      }
    ],
    "targetStatement": "Photosynthesis in Green Plants",
    "maxFragments": 6,
    "showHints": false
  }'::jsonb,
  config_schema = '{
    "fields": [
      {
        "key": "fragments",
        "label": "True/False Statements",
        "type": "array",
        "itemType": "object",
        "itemSchema": {
          "text": { "type": "string", "label": "Statement Text" },
          "isTrueInContext": { "type": "boolean", "label": "Is True?" },
          "explanation": { "type": "string", "label": "Explanation" }
        }
      },
      {
        "key": "targetStatement",
        "label": "Target Statement/Topic",
        "type": "string"
      },
      {
        "key": "showHints",
        "label": "Show Hints Before Submission",
        "type": "boolean",
        "default": false
      }
    ]
  }'::jsonb
WHERE id = 'true-false-selection';

-- Update fragment-builder interaction
UPDATE interaction_types 
SET 
  interaction_type_category = 'pixijs',
  sample_data = '{
    "fragments": [
      {"text": "Sample fragment 1", "isTrueInContext": true, "explanation": "This is true"},
      {"text": "Sample fragment 2", "isTrueInContext": false, "explanation": "This is false"}
    ],
    "targetStatement": "Example Topic",
    "maxFragments": 2,
    "showHints": true
  }'::jsonb,
  config_schema = '{
    "fields": [
      {
        "key": "fragments",
        "label": "Fragments",
        "type": "array"
      }
    ]
  }'::jsonb
WHERE id = 'fragment-builder';

-- Show results
SELECT id, name, interaction_type_category, 
       CASE WHEN sample_data IS NOT NULL THEN 'YES' ELSE 'NO' END as has_sample_data,
       CASE WHEN config_schema IS NOT NULL THEN 'YES' ELSE 'NO' END as has_config_schema
FROM interaction_types 
ORDER BY name;

