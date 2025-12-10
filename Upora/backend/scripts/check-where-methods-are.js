// Check where showOverlayHtml and hideOverlayHtml are in the code
const { DataSource } = require('typeorm');

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

async function check() {
  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    const result = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    
    const code = result[0].js_code;
    
    // Find createIframeAISDK
    const sdkIdx = code.indexOf('const createIframeAISDK');
    if (sdkIdx === -1) {
      console.error('❌ Could not find createIframeAISDK');
      process.exit(1);
    }
    
    // Find the end of createIframeAISDK (look for }; that closes the function)
    let sdkEnd = -1;
    let braceCount = 0;
    let inFunction = false;
    for (let i = sdkIdx; i < code.length && i < sdkIdx + 5000; i++) {
      if (code[i] === '{') {
        braceCount++;
        inFunction = true;
      } else if (code[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          // Check if next is semicolon
          if (i + 1 < code.length && code[i + 1] === ';') {
            sdkEnd = i + 2;
            break;
          }
        }
      }
    }
    
    if (sdkEnd === -1) {
      console.error('❌ Could not find end of createIframeAISDK');
      process.exit(1);
    }
    
    const sdkCode = code.substring(sdkIdx, sdkEnd);
    console.log('SDK code length:', sdkCode.length);
    console.log('Has showOverlayHtml in SDK:', sdkCode.includes('showOverlayHtml'));
    console.log('Has hideOverlayHtml in SDK:', sdkCode.includes('hideOverlayHtml'));
    
    // Find where showOverlayHtml is
    const showIdx = code.indexOf('showOverlayHtml');
    if (showIdx !== -1) {
      console.log('\nshowOverlayHtml found at index:', showIdx);
      console.log('Is inside createIframeAISDK?', showIdx >= sdkIdx && showIdx < sdkEnd);
      console.log('Context (100 chars before and after):');
      console.log(code.substring(Math.max(0, showIdx - 100), Math.min(code.length, showIdx + 200)));
    } else {
      console.log('\n❌ showOverlayHtml not found in code');
    }
    
    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

check();


