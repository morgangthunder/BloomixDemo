// Script to update SDK Test Media Player interaction with Code tab content
// This updates the interaction to have HTML, CSS, JS code and media config

const { DataSource } = require('typeorm');
const path = require('path');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'upora',
  entities: [path.join(__dirname, '../dist/**/*.entity.js')],
  synchronize: false,
  logging: true,
});

// HTML, CSS, JS code from the SQL file
const overlayHtml = `<div id="sdk-test-media-overlay">
  <div id="sdk-test-header">
    <h2>AI Teacher SDK Test - Media Player</h2>
    <p id="status-text">Initializing...</p>
  </div>
  <div id="sdk-test-buttons"></div>
  <div id="sdk-test-results"></div>
</div>`;

const overlayCss = `#sdk-test-media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15, 15, 35, 0.95);
  border-top: 2px solid rgba(0, 212, 255, 0.5);
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
  z-index: 1000;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

#sdk-test-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
}

#sdk-test-header h2 {
  color: #00d4ff;
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

#status-text {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 13px;
}

#sdk-test-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.test-button {
  padding: 10px 16px;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 6px;
  color: #00d4ff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.test-button:hover {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  transform: translateY(-2px);
}

.test-button:active {
  transform: translateY(0);
}

.section-label {
  grid-column: 1 / -1;
  color: #00d4ff;
  font-size: 16px;
  font-weight: bold;
  margin: 20px 0 10px 0;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

#sdk-test-results {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.result-item {
  padding: 8px;
  margin: 4px 0;
  background: rgba(0, 212, 255, 0.05);
  border-left: 3px solid #00d4ff;
  border-radius: 4px;
}

.result-item.error {
  border-left-color: #ff4444;
  color: #ff8888;
}

.result-item.success {
  border-left-color: #44ff44;
  color: #88ff88;
}`;

// JavaScript code is very long - read it from the migration file by line numbers
// The migration file has the code in a TypeScript template literal
const fs = require('fs');
const migrationPath = path.join(__dirname, '../src/migrations/1734600001000-CreateSDKTestMediaPlayerInteraction.ts');
const migrationLines = fs.readFileSync(migrationPath, 'utf8').split('\n');

// Use known line numbers for reliability
// From the migration file structure:
// - Line 111 (index 110): `const overlayJs = \``
// - Find the closing `\`;` by searching for it
const startLineIdx = 110; // Line 111 (0-indexed)
// Find the end line dynamically - look for the closing backtick and semicolon
let endLineIdx = -1;
for (let i = startLineIdx + 1; i < migrationLines.length; i++) {
  const trimmed = migrationLines[i].trim();
  if (trimmed === '`;' || trimmed.endsWith('`;')) {
    endLineIdx = i;
    break;
  }
}
if (endLineIdx === -1) {
  console.error('❌ Could not find end of overlayJs template literal');
  console.error('   Searched from line', startLineIdx + 2, 'to', migrationLines.length);
  process.exit(1);
}

// Verify the lines exist and contain expected content
if (startLineIdx >= migrationLines.length || !migrationLines[startLineIdx].includes('const overlayJs = `')) {
  console.error('❌ Could not find start line 111 (const overlayJs = `)');
  console.error(`   File has ${migrationLines.length} lines, expected at least ${startLineIdx + 1}`);
  process.exit(1);
}

if (endLineIdx >= migrationLines.length) {
  console.error('❌ End line index is beyond file length');
  console.error(`   File has ${migrationLines.length} lines, end line is ${endLineIdx + 1}`);
  process.exit(1);
}

console.log(`✅ Found overlayJs template literal: lines ${startLineIdx + 1} to ${endLineIdx + 1}`);
console.log(`   End line content: "${migrationLines[endLineIdx]?.trim()}"`);

console.log(`\n========================================`);
console.log(`EXTRACTION START`);
console.log(`========================================`);
console.log(`✅ Using known line numbers: ${startLineIdx + 1} to ${endLineIdx + 1}`);
console.log(`✅ Total lines to extract: ${endLineIdx - startLineIdx + 1}`);

// Extract lines between start and end (inclusive)
const codeLines = migrationLines.slice(startLineIdx, endLineIdx + 1);

// Remove the first line's prefix: "    const overlayJs = `"
if (codeLines[0]) {
  codeLines[0] = codeLines[0].replace(/^\s*const overlayJs = `\s*/, '');
}

// Remove the last line's suffix: "    `;"
if (codeLines[codeLines.length - 1]) {
  codeLines[codeLines.length - 1] = codeLines[codeLines.length - 1].replace(/\s*`;\s*$/, '');
}

// Join lines and unescape backticks and template expressions
let overlayJs = codeLines.join('\n');
console.log(`🔍 Joined code length before unescaping: ${overlayJs.length} characters`);

// The migration file has escaped backticks (\`) and escaped template expressions (\${})
// We need to unescape them to get the actual JavaScript code
const beforeUnescape = overlayJs.length;
overlayJs = overlayJs.replace(/\\`/g, '`');
overlayJs = overlayJs.replace(/\\\$\{/g, '${');
console.log(`🔍 Code length after unescaping: ${overlayJs.length} characters (was ${beforeUnescape})`);

// Verify the code is complete
const codeLength = overlayJs.length;
const endsWith = overlayJs.substring(Math.max(0, overlayJs.length - 100));
const hasAllButtons = overlayJs.includes('All buttons created');
const hasGenerateRequestId = overlayJs.includes('generateRequestId');
const hasCompleteTemplate = overlayJs.includes('req-${Date.now()}') || overlayJs.includes('req-\\${Date.now()}');

console.log('\n========================================');
console.log('CODE EXTRACTION VERIFICATION');
console.log('========================================');
console.log(`Length: ${codeLength} characters`);
console.log(`Expected: ~5000+ characters`);
console.log(`Last 100 chars: ${endsWith}`);
console.log(`Contains "All buttons created": ${hasAllButtons}`);
console.log(`Contains "generateRequestId": ${hasGenerateRequestId}`);
console.log(`Contains complete template literal: ${hasCompleteTemplate}`);
console.log('========================================\n');

if (codeLength < 1000) {
  console.error('❌ ERROR: Code is too short! Expected ~5000+ characters but got', codeLength);
  console.error('This indicates the extraction failed. Please check the migration file.');
  process.exit(1);
}

if (!hasAllButtons) {
  console.error('❌ ERROR: Code does not contain "All buttons created"');
  console.error('This indicates the extraction is incomplete.');
  process.exit(1);
}

console.log(`🔍 Extracted raw JavaScript code: ${overlayJs.length} characters`);
console.log(`🔍 First 200 chars: ${overlayJs.substring(0, 200)}`);
console.log(`🔍 Last 200 chars: ${overlayJs.substring(Math.max(0, overlayJs.length - 200))}`);

if (overlayJs.length < 100) {
  console.error('❌ Extracted JavaScript code is too short:', overlayJs.length);
  process.exit(1);
}

// Handle any SQL-escaped quotes if they exist (shouldn't in migration file, but just in case)
overlayJs = overlayJs.replace(/''/g, "'");

console.log(`✅ Processed JavaScript code: ${overlayJs.length} characters`);
console.log(`✅ First 100 chars: ${overlayJs.substring(0, 100)}`);
console.log(`✅ Last 100 chars: ${overlayJs.substring(overlayJs.length - 100)}`);

async function updateInteraction() {
  try {
    await dataSource.initialize();
    console.log('✅ DataSource initialized');
    
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Log before storing - use process.stdout.write to bypass TypeORM logging filter
      process.stdout.write(`\n📦 About to store JavaScript code: ${overlayJs.length} characters\n`);
      process.stdout.write(`📦 Contains 'All buttons created': ${overlayJs.includes('All buttons created')}\n`);
      process.stdout.write(`📦 Contains 'generateRequestId': ${overlayJs.includes('generateRequestId')}\n`);
      process.stdout.write(`📦 Last 100 chars: ${overlayJs.substring(Math.max(0, overlayJs.length - 100))}\n\n`);
      
      // Verify code length before storing
      console.log(`\n📦 Storing code: ${overlayJs.length} characters`);
      console.log(`📦 Last 100 chars before store: ${overlayJs.substring(Math.max(0, overlayJs.length - 100))}`);
      
      // Verify code length one more time before storing
      console.log(`\n🔍 FINAL VERIFICATION BEFORE STORE:`);
      console.log(`   Code length: ${overlayJs.length} characters`);
      console.log(`   First 100: ${overlayJs.substring(0, 100)}`);
      console.log(`   Last 100: ${overlayJs.substring(Math.max(0, overlayJs.length - 100))}`);
      console.log(`   Contains "All buttons created": ${overlayJs.includes('All buttons created')}`);
      
      // Escape single quotes for SQL (double them)
      // This is safe because we control the input - it's from our own migration file
      const escapedJs = overlayJs.replace(/'/g, "''");
      const escapedHtml = overlayHtml.replace(/'/g, "''");
      const escapedCss = overlayCss.replace(/'/g, "''");
      const mediaConfigJson = JSON.stringify({ autoplay: false, loop: false, showControls: true, defaultVolume: 1.0, displayMode: 'section', sectionHeight: 'auto', sectionMinHeight: '200px', sectionMaxHeight: 'none' });
      const description = 'Comprehensive test interaction for all AI Teacher SDK functionality including media control methods. This interaction uses an overlay at the bottom of the media player to display test buttons. Select a media file in the Settings tab, then view the Code tab to see the overlay HTML/CSS/JS code.';
      const escapedDescription = description.replace(/'/g, "''");
      
      // Use raw SQL with proper escaping to avoid parameter truncation issues
      // This is safe because we control all inputs (from our migration file)
      await queryRunner.query(`
        UPDATE interaction_types
        SET
          media_config = '${mediaConfigJson}'::jsonb,
          html_code = '${escapedHtml}',
          css_code = '${escapedCss}',
          js_code = '${escapedJs}',
          description = '${escapedDescription}'
        WHERE id = 'sdk-test-media-player';
      `);
      
      // Verify what was actually stored
      const storedResult = await queryRunner.query(`
        SELECT LENGTH(js_code) as len FROM interaction_types WHERE id = 'sdk-test-media-player'
      `);
      console.log(`\n✅ VERIFICATION AFTER STORE:`);
      console.log(`   Stored code length: ${storedResult[0]?.len || 'NOT FOUND'} characters`);
      console.log(`   Expected length: ${overlayJs.length} characters`);
      if (storedResult[0]?.len !== overlayJs.length) {
        console.error(`   ❌ MISMATCH! Expected ${overlayJs.length} but got ${storedResult[0]?.len}`);
        throw new Error(`Code length mismatch: expected ${overlayJs.length}, got ${storedResult[0]?.len}`);
      } else {
        console.log(`   ✅ SUCCESS! Code length matches expected value.`);
      }
      
      // Verify what was stored
      const verifyResult = await queryRunner.query(`
        SELECT LENGTH(js_code) as len, SUBSTRING(js_code, LENGTH(js_code) - 100) as end
        FROM interaction_types
        WHERE id = 'sdk-test-media-player'
      `);
      console.log(`\n✅ Stored code length: ${verifyResult[0].len} characters`);
      console.log(`✅ Last 100 chars after store: ${verifyResult[0].end}`);
      console.log(`✅ Contains "All buttons created": ${verifyResult[0].end?.includes('All buttons created') ? 'YES' : 'NO'}\n`);
      
      console.log(`✅ Update query executed successfully`);
      
      await queryRunner.commitTransaction();
      console.log('✅ SDK Test Media Player interaction updated with Code tab content');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
    
    await dataSource.destroy();
    console.log('✅ DataSource destroyed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

updateInteraction();

