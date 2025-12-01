// Script to create SDK Test PixiJS interaction build via API
const http = require('http');

const interactionData = {
  id: 'sdk-test-pixijs',
  name: 'SDK Test - PixiJS',
  description: 'Comprehensive test interaction for all AI Teacher SDK functionality including data storage, UI controls, events, and responses. Copy the full code from Upora/backend/scripts/sdk-test-pixijs-full-code.js',
  category: 'absorb-show',
  schema: {},
  generationPrompt: 'This is a test interaction for SDK functionality.',
  interactionTypeCategory: 'pixijs',
  htmlCode: '<div id="pixi-container"></div>',
  cssCode: 'body { margin: 0; padding: 0; background: #0f0f23; overflow: hidden; } #pixi-container { width: 100vw; height: 100vh; }',
  jsCode: '// SDK Test PixiJS Interaction\n// This is a placeholder - the full test code is in: Upora/backend/scripts/sdk-test-pixijs-full-code.js\n// Please copy the full code from that file into this interaction via the interaction builder UI\nconsole.log(\'SDK Test Interaction - Please copy full code from sdk-test-pixijs-full-code.js\');',
  configSchema: { fields: [] },
  sampleData: {},
  instanceDataSchema: {
    fields: [
      { name: 'testValue', type: 'number', required: false, description: 'Test numeric value' },
      { name: 'timestamp', type: 'number', required: false, description: 'Timestamp of test' },
      { name: 'testArray', type: 'array', required: false, description: 'Test array' }
    ]
  },
  userProgressSchema: {
    customFields: [
      { name: 'testField', type: 'string', required: false, description: 'Test string field' },
      { name: 'testNumber', type: 'number', required: false, description: 'Test number field' }
    ]
  },
  isActive: true
};

const postData = JSON.stringify(interactionData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/interaction-types',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'x-user-id': 'system',
    'x-tenant-id': 'system'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log('✅ SDK Test PixiJS interaction build created successfully!');
      console.log('Response:', data);
    } else {
      console.error('❌ Error creating interaction build:', res.statusCode);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();

