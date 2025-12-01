import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSDKTestHTMLInteraction1734500003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The full code is in: Upora/backend/scripts/sdk-test-html-full-code.js
    // Please copy the HTML, CSS, and JS code from that file into this interaction via the interaction builder UI
    const htmlCode = `<div id="sdk-test-container">
  <div id="sdk-test-header">
    <h1>AI Teacher SDK Test - HTML</h1>
    <p id="status-text">Initializing...</p>
  </div>
  <div id="sdk-test-buttons"></div>
</div>`;

    const cssCode = `body {
  margin: 0;
  padding: 0;
  background: #0f0f23;
  color: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow-y: auto;
}
#sdk-test-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
#sdk-test-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(0, 212, 255, 0.3);
}
#sdk-test-header h1 {
  color: #00d4ff;
  margin: 0 0 10px 0;
  font-size: 24px;
}
#status-text {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 14px;
}
.section-label {
  color: #00d4ff;
  font-size: 18px;
  font-weight: bold;
  margin: 30px 0 15px 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.test-button {
  display: block;
  width: 100%;
  max-width: 500px;
  padding: 12px 20px;
  margin: 8px 0;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  color: #00d4ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.test-button:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  transform: translateX(5px);
}
.test-button:active {
  transform: translateX(2px);
}`;

    const jsCode = `// SDK Test HTML Interaction
// This is a placeholder - the full test code is in: Upora/backend/scripts/sdk-test-html-full-code.js
// Please copy the full JavaScript code from that file into this interaction via the interaction builder UI
console.log('SDK Test HTML Interaction - Please copy full code from sdk-test-html-full-code.js');`;

    await queryRunner.query(`
      INSERT INTO interaction_types (
        id, name, description, category, schema, generation_prompt,
        interaction_type_category, html_code, css_code, js_code,
        config_schema, sample_data, instance_data_schema, user_progress_schema, is_active
      ) VALUES (
        'sdk-test-html',
        'SDK Test - HTML',
        'Comprehensive test interaction for all AI Teacher SDK functionality using standard HTML/CSS/JS. Copy the full code from Upora/backend/scripts/sdk-test-html-full-code.js',
        'absorb-show',
        '{}',
        'This is a test interaction for SDK functionality using HTML.',
        'html',
        $1,
        $2,
        $3,
        '{"fields": [{"key": "goFullscreenOnLoad", "type": "boolean", "label": "Go to fullscreen on load", "default": false, "description": "Automatically activate fullscreen mode when the interaction loads"}]}',
        '{"message": "Sample data for SDK test interaction. When using processed content, the processed output data will replace this sample data.", "processedContentFormat": "Processed content should be a JSON object that will replace the sample data. Common fields include: data, content, metadata, etc."}',
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
    `, [htmlCode, cssCode, jsCode]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM interaction_types WHERE id = 'sdk-test-html'`);
  }
}

