-- Update configSchema for true-false-selection to be comprehensive
-- The schema should define EXACTLY what appears in the config modal

UPDATE interaction_types
SET config_schema = '{
  "fields": [
    {
      "key": "targetStatement",
      "type": "string",
      "label": "Target Statement/Topic",
      "placeholder": "e.g., Photosynthesis in Green Plants",
      "hint": "The main topic or statement that students will evaluate. This appears at the top of the interaction.",
      "required": false
    },
    {
      "key": "showHints",
      "type": "boolean",
      "label": "Show Hints Before Submission",
      "hint": "When enabled, students can hover over statements to see explanations before submitting their answer.",
      "default": false
    },
    {
      "key": "maxSelections",
      "type": "number",
      "label": "Maximum Selections Allowed",
      "placeholder": "Leave empty for unlimited",
      "hint": "Limit how many statements students can select. Useful for focused practice.",
      "min": 1,
      "max": 20,
      "required": false
    },
    {
      "key": "fragments",
      "type": "array",
      "label": "True/False Statements",
      "hint": "The statements are automatically loaded from your selected processed content output. You can configure which content output to use in the Script tab.",
      "readOnly": true,
      "itemType": "object",
      "itemSchema": {
        "text": {
          "type": "string",
          "label": "Statement Text"
        },
        "explanation": {
          "type": "string",
          "label": "Explanation"
        },
        "isTrueInContext": {
          "type": "boolean",
          "label": "Is True?"
        }
      }
    }
  ]
}'
WHERE id = 'true-false-selection';

