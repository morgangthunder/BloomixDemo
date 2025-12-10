// Replace the entire js_code with the complete code from the migration file
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

async function replaceCode() {
  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../src/migrations/1734600001000-CreateSDKTestMediaPlayerInteraction.ts');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Extract the overlayJs template literal
    // It starts at line 111 with: const overlayJs = `
    // It ends before line 616 with: `;
    const lines = migrationContent.split('\n');
    const startLineIdx = 110; // Line 111 (0-indexed)
    
    // Find the end line (look for `; that closes the template literal)
    let endLineIdx = -1;
    for (let i = startLineIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === '`;' || lines[i].trim().endsWith('`;')) {
        endLineIdx = i;
        break;
      }
    }
    
    if (endLineIdx === -1) {
      console.error('❌ Could not find end of overlayJs template literal');
      process.exit(1);
    }
    
    // Extract the code
    const codeLines = lines.slice(startLineIdx, endLineIdx + 1);
    
    // Remove the first line's prefix
    if (codeLines[0]) {
      codeLines[0] = codeLines[0].replace(/^\s*const overlayJs = `\s*/, '');
    }
    
    // Remove the last line's suffix
    if (codeLines[codeLines.length - 1]) {
      codeLines[codeLines.length - 1] = codeLines[codeLines.length - 1].replace(/\s*`;\s*$/, '');
    }
    
    let overlayJs = codeLines.join('\n');
    
    // Unescape backticks and template expressions
    overlayJs = overlayJs.replace(/\\`/g, '`');
    overlayJs = overlayJs.replace(/\\\$\{/g, '${');
    
    console.log('✅ Extracted JavaScript code, length:', overlayJs.length);
    console.log('✅ Has showOverlayHtml:', overlayJs.includes('showOverlayHtml'));
    console.log('✅ Has hideOverlayHtml:', overlayJs.includes('hideOverlayHtml'));
    
    // Check if createIframeAISDK has the methods
    const createIframeMatch = overlayJs.match(/const createIframeAISDK = \(\) => \{[\s\S]*?\};/);
    if (createIframeMatch) {
      const funcCode = createIframeMatch[0];
      console.log('✅ createIframeAISDK has showOverlayHtml:', funcCode.includes('showOverlayHtml'));
      console.log('✅ createIframeAISDK has hideOverlayHtml:', funcCode.includes('hideOverlayHtml'));
    }
    
    // Escape single quotes for SQL
    const escapedJs = overlayJs.replace(/'/g, "''");
    
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escapedJs}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Updated JavaScript code in database');
    
    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

replaceCode();


