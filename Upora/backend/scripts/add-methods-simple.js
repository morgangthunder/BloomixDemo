// Simple script to add methods before the closing brace of the return object
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

async function addMethods() {
  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    const result = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    
    let jsCode = result[0].js_code;
    
    // Find the createIframeAISDK function
    // Look for the pattern: return { ... };
    // We need to find where the return object closes (before the }; that closes the function)
    
    // Strategy: Find "return {" and then find the matching closing brace
    const returnIndex = jsCode.indexOf('return {', jsCode.indexOf('const createIframeAISDK'));
    if (returnIndex === -1) {
      console.error('❌ Could not find return statement in createIframeAISDK');
      process.exit(1);
    }
    
    // Find the closing brace of the return object (before the }; that closes the function)
    // Count braces to find the matching one
    let braceCount = 0;
    let inReturn = false;
    let insertIndex = -1;
    
    for (let i = returnIndex; i < jsCode.length; i++) {
      if (jsCode[i] === '{') {
        braceCount++;
        if (jsCode.substring(i, i + 8) === 'return {') {
          inReturn = true;
        }
      } else if (jsCode[i] === '}') {
        braceCount--;
        if (inReturn && braceCount === 0) {
          // This is the closing brace of the return object
          insertIndex = i;
          break;
        }
      }
    }
    
    if (insertIndex === -1) {
      console.error('❌ Could not find closing brace of return object');
      process.exit(1);
    }
    
    // Check if methods already exist
    const beforeClose = jsCode.substring(returnIndex, insertIndex);
    if (beforeClose.includes('showOverlayHtml: () =>')) {
      console.log('✅ Methods already exist in createIframeAISDK');
      await queryRunner.release();
      await dataSource.destroy();
      return;
    }
    
    // Add methods before the closing brace
    const newMethods = `
            // Media Control Methods
            playMedia: (callback) => {
              sendMessage("ai-sdk-play-media", {}, (response) => {
                if (callback) {
                  callback(response.success, response.error);
                }
              });
            },
            pauseMedia: () => {
              sendMessage("ai-sdk-pause-media", {});
            },
            seekMedia: (time) => {
              sendMessage("ai-sdk-seek-media", { time });
            },
            setMediaVolume: (volume) => {
              sendMessage("ai-sdk-set-media-volume", { volume });
            },
            getMediaCurrentTime: (callback) => {
              sendMessage("ai-sdk-get-media-current-time", {}, (response) => {
                if (callback) {
                  callback(response.currentTime);
                }
              });
            },
            getMediaDuration: (callback) => {
              sendMessage("ai-sdk-get-media-duration", {}, (response) => {
                if (callback) {
                  callback(response.duration);
                }
              });
            },
            isMediaPlaying: (callback) => {
              sendMessage("ai-sdk-is-media-playing", {}, (response) => {
                if (callback) {
                  callback(response.isPlaying);
                }
              });
            },
            showOverlayHtml: () => {
              sendMessage("ai-sdk-show-overlay-html", {});
            },
            hideOverlayHtml: () => {
              sendMessage("ai-sdk-hide-overlay-html", {});
            }`;
    
    jsCode = jsCode.substring(0, insertIndex) + newMethods + '\n          ' + jsCode.substring(insertIndex);
    
    // Escape single quotes for SQL
    const escapedJs = jsCode.replace(/'/g, "''");
    
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escapedJs}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Added methods to createIframeAISDK');
    
    // Verify
    const verifyResult = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    const verifyCode = verifyResult[0].js_code;
    const createIframeIndex = verifyCode.indexOf('const createIframeAISDK');
    const returnIndex2 = verifyCode.indexOf('return {', createIframeIndex);
    const beforeClose2 = verifyCode.substring(returnIndex2, verifyCode.indexOf('}', returnIndex2 + 100));
    console.log('✅ Verification: has showOverlayHtml:', beforeClose2.includes('showOverlayHtml'));
    console.log('✅ Verification: has hideOverlayHtml:', beforeClose2.includes('hideOverlayHtml'));
    
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

addMethods();


