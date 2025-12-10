// Replace entire js_code with code from migration file (lines 111-615)
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    
    // Extract code from migration using sed
    const migrationPath = path.join(__dirname, '../src/migrations/1734600001000-CreateSDKTestMediaPlayerInteraction.ts');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const lines = migrationContent.split('\n');
    
    // Extract lines 111-615 (0-indexed: 110-614)
    const codeLines = lines.slice(110, 615);
    
    // Remove first line prefix and last line suffix
    if (codeLines[0]) {
      codeLines[0] = codeLines[0].replace(/^\s*const overlayJs = `\s*/, '');
    }
    if (codeLines[codeLines.length - 1]) {
      codeLines[codeLines.length - 1] = codeLines[codeLines.length - 1].replace(/\s*`;\s*$/, '');
    }
    
    let code = codeLines.join('\n');
    
    // Unescape
    code = code.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
    
    console.log('✅ Extracted code, length:', code.length);
    console.log('✅ Has showOverlayHtml:', code.includes('showOverlayHtml'));
    console.log('✅ Has hideOverlayHtml:', code.includes('hideOverlayHtml'));
    
    // Check createIframeAISDK
    const sdkStart = code.indexOf('const createIframeAISDK = () => {');
    if (sdkStart !== -1) {
      // Find end of function
      let braceCount = 0;
      let sdkEnd = -1;
      for (let i = sdkStart; i < code.length && i < sdkStart + 10000; i++) {
        if (code[i] === '{') braceCount++;
        else if (code[i] === '}') {
          braceCount--;
          if (braceCount === 0 && i + 1 < code.length && code[i + 1] === ';') {
            sdkEnd = i + 2;
            break;
          }
        }
      }
      if (sdkEnd !== -1) {
        const sdkCode = code.substring(sdkStart, sdkEnd);
        console.log('✅ createIframeAISDK length:', sdkCode.length);
        console.log('✅ createIframeAISDK has showOverlayHtml:', sdkCode.includes('showOverlayHtml'));
        console.log('✅ createIframeAISDK has hideOverlayHtml:', sdkCode.includes('hideOverlayHtml'));
      }
    }
    
    // Escape and update
    const escaped = code.replace(/'/g, "''");
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escaped}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Database updated with complete code from migration');
    
    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

replaceCode();


