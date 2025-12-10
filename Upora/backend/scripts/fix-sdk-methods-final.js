// Final script to update the SDK code with all methods from migration
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'upora',
  synchronize: false,
  logging: false,
});

async function fixCode() {
  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../src/migrations/1734600001000-CreateSDKTestMediaPlayerInteraction.ts');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const lines = migrationContent.split('\n');
    
    // Known line numbers: overlayJs starts at line 111 (index 110) and ends at line 615 (index 614)
    const startIdx = 110; // Line 111 (0-indexed)
    const endIdx = 614;   // Line 615 (0-indexed)
    
    if (startIdx >= lines.length || endIdx >= lines.length) {
      console.error('❌ Line numbers out of range');
      console.error(`   File has ${lines.length} lines, need ${endIdx + 1}`);
      process.exit(1);
    }
    
    // Extract code lines
    const codeLines = lines.slice(startIdx, endIdx + 1);
    
    // Remove the first line's prefix: "    const overlayJs = `"
    if (codeLines[0]) {
      codeLines[0] = codeLines[0].replace(/^\s*const overlayJs = `\s*/, '');
    }
    
    // Remove the last line's suffix: "    `;"
    if (codeLines[codeLines.length - 1]) {
      codeLines[codeLines.length - 1] = codeLines[codeLines.length - 1].replace(/\s*`;\s*$/, '');
    }
    
    // Join and unescape
    let code = codeLines.join('\n');
    code = code.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
    
    console.log('✅ Extracted code, length:', code.length);
    console.log('✅ Has showOverlayHtml:', code.includes('showOverlayHtml'));
    console.log('✅ Has hideOverlayHtml:', code.includes('hideOverlayHtml'));
    
    // Check if createIframeAISDK has the methods
    const sdkMatch = code.match(/const createIframeAISDK = \(\) => \{[\s\S]*?\};/);
    if (sdkMatch) {
      console.log('✅ createIframeAISDK has showOverlayHtml:', sdkMatch[0].includes('showOverlayHtml'));
      console.log('✅ createIframeAISDK has hideOverlayHtml:', sdkMatch[0].includes('hideOverlayHtml'));
    }
    
    // Escape and update
    const escaped = code.replace(/'/g, "''");
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escaped}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Database updated');
    
    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

fixCode();

