import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSDKTestIframeInteraction1734500004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // For iframe interactions, we create a document that can be uploaded
    // The full code is in: Upora/backend/scripts/sdk-test-html-full-code.js (same as HTML version)
    // The iframe document should contain the full HTML document with embedded CSS and JS
    
    await queryRunner.query(`
      INSERT INTO interaction_types (
        id, name, description, category, schema, generation_prompt,
        interaction_type_category, iframe_config, config_schema, sample_data,
        instance_data_schema, user_progress_schema, is_active
      ) VALUES (
        'sdk-test-iframe',
        'SDK Test - iFrame',
        'Comprehensive test interaction for all AI Teacher SDK functionality using an iframe document. Create an HTML document using the code from Upora/backend/scripts/sdk-test-html-full-code.js and upload it as the iframe document.',
        'absorb-show',
        '{}',
        'This is a test interaction for SDK functionality using an iframe.',
        'iframe',
        '{"allowFullscreen": true, "sandbox": "allow-scripts allow-same-origin"}',
        '{"fields": [{"key": "goFullscreenOnLoad", "type": "boolean", "label": "Go to fullscreen on load", "default": false, "description": "Automatically activate fullscreen mode when the interaction loads"}]}',
        '{"message": "Sample data for SDK test interaction. When using processed content, the processed output data will replace this sample data.", "processedContentFormat": "Processed content should be a JSON object that will replace the sample data. Common fields include: data, content, metadata, etc."}',
        '{"fields": [{"name": "testValue", "type": "number", "required": false, "description": "Test numeric value"}, {"name": "timestamp", "type": "number", "required": false, "description": "Timestamp of test"}, {"name": "testArray", "type": "array", "required": false, "description": "Test array"}]}',
        '{"customFields": [{"name": "testField", "type": "string", "required": false, "description": "Test string field"}, {"name": "testNumber", "type": "number", "required": false, "description": "Test number field"}]}',
        true
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        iframe_config = EXCLUDED.iframe_config,
        instance_data_schema = EXCLUDED.instance_data_schema,
        user_progress_schema = EXCLUDED.user_progress_schema;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM interaction_types WHERE id = 'sdk-test-iframe'`);
  }
}

