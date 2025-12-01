import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSDKTestPixiJSInteraction1734500002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Read the full test code from the scripts file
    // Note: In a real migration, you'd read from file system or embed the code
    // For now, we'll create the interaction type with a note that the full code
    // should be copied from Upora/backend/scripts/sdk-test-pixijs-full-code.js
    
    // The full code is too long to embed in migration, so we create a placeholder
    // The actual code should be added via the interaction builder UI or a separate script
    const jsCode = `// SDK Test PixiJS Interaction
// This is a placeholder - the full test code is in: Upora/backend/scripts/sdk-test-pixijs-full-code.js
// Please copy the full code from that file into this interaction via the interaction builder UI
console.log('SDK Test Interaction - Please copy full code from sdk-test-pixijs-full-code.js');`;

    await queryRunner.query(`
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
        $1,
        '{"fields": [{"key": "goFullscreenOnLoad", "type": "boolean", "label": "Go to fullscreen on load", "default": false, "description": "Automatically activate fullscreen mode when the interaction loads"}]}',
        '{"message": "Sample data for SDK test interaction. When using processed content, the processed output data will be merged with this sample data.", "processedContentFormat": "Processed content should be a JSON object that will be merged with the sample data. Common fields include: data, content, metadata, etc."}',
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
    `, [jsCode]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM interaction_types WHERE id = 'sdk-test-pixijs'`);
  }
}

