-- Create SDK Test PixiJS Interaction Build
INSERT INTO interaction_types (
  id, name, description, category, schema, generation_prompt,
  interaction_type_category, html_code, css_code, js_code,
  config_schema, sample_data, instance_data_schema, user_progress_schema, is_active
) VALUES (
  'sdk-test-pixijs',
  'SDK Test - PixiJS',
  'Comprehensive test interaction for all AI Teacher SDK functionality including data storage, UI controls, events, and responses. Copy the full code from Upora/backend/scripts/sdk-test-pixijs-full-code.js',
  'absorb-show',
  '{}',
  'This is a test interaction for SDK functionality.',
  'pixijs',
  '<div id="pixi-container"></div>',
  'body { margin: 0; padding: 0; background: #0f0f23; overflow: hidden; } #pixi-container { width: 100vw; height: 100vh; }',
  '// SDK Test PixiJS Interaction
// This is a placeholder - the full test code is in: Upora/backend/scripts/sdk-test-pixijs-full-code.js
// Please copy the full code from that file into this interaction via the interaction builder UI
console.log(''SDK Test Interaction - Please copy full code from sdk-test-pixijs-full-code.js'');',
  '{"fields": []}',
  '{}',
  '{"fields": [{"name": "testValue", "type": "number", "required": false, "description": "Test numeric value"}, {"name": "timestamp", "type": "number", "required": false, "description": "Timestamp of test"}, {"name": "testArray", "type": "array", "required": false, "description": "Test array"}]}',
  '{"customFields": [{"name": "testField", "type": "string", "required": false, "description": "Test string field"}, {"name": "testNumber", "type": "number", "required": false, "description": "Test number field"}]}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_code = EXCLUDED.html_code,
  css_code = EXCLUDED.css_code,
  instance_data_schema = EXCLUDED.instance_data_schema,
  user_progress_schema = EXCLUDED.user_progress_schema;

