-- Insert SDK Test Media Player Interaction
-- This script directly inserts the interaction type into the database

-- Note: The overlay HTML/CSS/JS code is embedded in the migration file
-- This SQL script extracts the key parts for direct insertion

INSERT INTO interaction_types (
  id, name, description, category, schema, generation_prompt,
  interaction_type_category, html_code, css_code, js_code,
  config_schema, sample_data,
  instance_data_schema, user_progress_schema, is_active
) VALUES (
  'sdk-test-media-player',
  'SDK Test - Media Player',
  'Comprehensive test interaction for all AI Teacher SDK functionality including media control methods. This interaction uses an overlay at the bottom of the media player to display test buttons.',
  'absorb-show',
  '{}',
  'This is a test interaction for SDK functionality with media control methods.',
  'uploaded-media',
  '<div id="sdk-test-media-overlay"><div id="sdk-test-header"><h2>AI Teacher SDK Test - Media Player</h2><p id="status-text">Initializing...</p></div><div id="sdk-test-buttons"></div><div id="sdk-test-results"></div></div>',
  '#sdk-test-media-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 15, 35, 0.95); border-top: 2px solid rgba(0, 212, 255, 0.5); padding: 20px; max-height: 60vh; overflow-y: auto; z-index: 1000; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; } #sdk-test-header { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(0, 212, 255, 0.3); } #sdk-test-header h2 { color: #00d4ff; margin: 0 0 8px 0; font-size: 20px; font-weight: 600; } #status-text { color: rgba(255, 255, 255, 0.7); margin: 0; font-size: 13px; } #sdk-test-buttons { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px; } .test-button { padding: 10px 16px; background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 6px; color: #00d4ff; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; text-align: center; } .test-button:hover { background: rgba(0, 212, 255, 0.2); border-color: #00d4ff; transform: translateY(-2px); } .test-button:active { transform: translateY(0); } .section-label { grid-column: 1 / -1; color: #00d4ff; font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1); } #sdk-test-results { margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); font-size: 12px; max-height: 200px; overflow-y: auto; } .result-item { padding: 8px; margin: 4px 0; background: rgba(0, 212, 255, 0.05); border-left: 3px solid #00d4ff; border-radius: 4px; } .result-item.error { border-left-color: #ff4444; color: #ff8888; } .result-item.success { border-left-color: #44ff44; color: #88ff88; }',
  '// Full JavaScript code is in the migration file - this is a placeholder. The actual JS code should be loaded from the migration.',
  '{"fields": [{"key": "goFullscreenOnLoad", "type": "boolean", "label": "Go to fullscreen on load", "default": false, "description": "Automatically activate fullscreen mode when the interaction loads"}]}',
  '{"message": "This is a test interaction. Select a media file (video or audio) in the interaction configuration."}',
  '{"fields": [{"name": "testValue", "type": "number", "required": false, "description": "Test numeric value"}, {"name": "timestamp", "type": "number", "required": false, "description": "Timestamp of test"}, {"name": "testArray", "type": "array", "required": false, "description": "Test array"}]}',
  '{"customFields": [{"name": "testField", "type": "string", "required": false, "description": "Test string field"}, {"name": "testNumber", "type": "number", "required": false, "description": "Test number field"}]}',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  html_code = EXCLUDED.html_code,
  css_code = EXCLUDED.css_code,
  js_code = EXCLUDED.js_code,
  instance_data_schema = EXCLUDED.instance_data_schema,
  user_progress_schema = EXCLUDED.user_progress_schema;

