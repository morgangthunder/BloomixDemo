-- Update iFrame config schema to show URL as read-only in builder mode
-- The modal will show this as disabled with a helpful hint

UPDATE interaction_types 
SET config_schema = '{
  "fields": [
    {
      "key": "url",
      "type": "string",
      "label": "iFrame URL",
      "required": true,
      "placeholder": "https://example.com",
      "hint": "The URL of the content to embed. Must be a valid web address that allows embedding.",
      "builderReadOnly": true,
      "builderHint": "In Builder mode, loads from sample data"
    },
    {
      "key": "width",
      "type": "string",
      "label": "Width",
      "default": "100%",
      "placeholder": "100% or 800px",
      "hint": "Width of the iframe (e.g., 100%, 800px). Default: 100%"
    },
    {
      "key": "height",
      "type": "string",
      "label": "Height",
      "default": "600px",
      "placeholder": "600px or 100%",
      "hint": "Height of the iframe (e.g., 600px, 100vh). Default: 600px"
    },
    {
      "key": "allow",
      "type": "string",
      "label": "Allow Permissions",
      "default": "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      "multiline": true,
      "rows": 3,
      "placeholder": "accelerometer; autoplay; clipboard-write",
      "hint": "Semicolon-separated list of iframe permissions. Controls what features the embedded content can access."
    }
  ]
}'
WHERE id = 'iframe-embed';

