import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSDKTestIframeInteraction1734500004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // For iframe interactions, we use iframeUrl with a data URL containing the HTML document
    // The full HTML document code is in: Upora/backend/scripts/sdk-test-iframe-document.html
    
    // Read the HTML document and create a data URL
    // Note: In production, this would be served from a blob URL or file storage
    // For now, we'll use a placeholder that will be replaced when the interaction is loaded
    // The actual iframeUrl should point to the HTML document content as a data URL or blob URL
    
    // Since we can't easily create blob URLs in migrations, we'll set a placeholder
    // The frontend will need to create a blob URL from the HTML document content
    // For now, we'll use a data URL with the HTML content embedded
    
    const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Teacher SDK Test - iFrame</title>
  <style>
    body {
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
    }
  </style>
</head>
<body>
  <div id="sdk-test-container">
    <div id="sdk-test-header">
      <h1>AI Teacher SDK Test - iFrame</h1>
      <p id="status-text">Initializing...</p>
    </div>
    <div id="sdk-test-buttons"></div>
  </div>
  <script>
    // Full JavaScript code from sdk-test-html-full-code.js would go here
    // For brevity, this is a placeholder - the full code should be loaded
    console.log('SDK Test iFrame - Full code should be loaded from sdk-test-iframe-document.html');
  </script>
</body>
</html>`;

    // Note: Data URLs have size limits, so we'll use a placeholder
    // The full HTML document is in: Upora/backend/scripts/sdk-test-iframe-document.html
    // For iframe interactions, the iframeUrl should point to a blob URL or file server URL
    // In production, this would be served from file storage
    // For now, we'll create it with a note that the URL needs to be set manually
    // OR the frontend can create a blob URL from the HTML document content
    
    await queryRunner.query(`
      INSERT INTO interaction_types (
        id, name, description, category, schema, generation_prompt,
        interaction_type_category, iframe_config, config_schema, sample_data,
        instance_data_schema, user_progress_schema, is_active
      ) VALUES (
        'sdk-test-iframe',
        'SDK Test - iFrame',
        'Comprehensive test interaction for all AI Teacher SDK functionality using an iframe. The full HTML document is in Upora/backend/scripts/sdk-test-iframe-document.html. For iframe interactions, you need to set the iframeUrl field to point to the HTML document (via blob URL or file server).',
        'absorb-show',
        '{}',
        'This is a test interaction for SDK functionality using an iframe.',
        'iframe',
        '{"allowFullscreen": true, "sandbox": "allow-scripts allow-same-origin"}',
        '{"fields": [{"key": "goFullscreenOnLoad", "type": "boolean", "label": "Go to fullscreen on load", "default": false, "description": "Automatically activate fullscreen mode when the interaction loads"}]}',
        '{"url": "", "message": "For iframe interactions, set the iframeUrl field to point to the HTML document. The full HTML document is in Upora/backend/scripts/sdk-test-iframe-document.html"}',
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

