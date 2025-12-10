// Add methods inside the return object, before it closes
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
    
    // Find createIframeAISDK
    const sdkStart = jsCode.indexOf('const createIframeAISDK = () => {');
    if (sdkStart === -1) {
      console.error('❌ Could not find createIframeAISDK');
      process.exit(1);
    }
    
    // Find "return {" 
    const returnStart = jsCode.indexOf('return {', sdkStart);
    if (returnStart === -1) {
      console.error('❌ Could not find return statement');
      process.exit(1);
    }
    
    // Find the closing brace of the return object
    // Count braces: when we hit return {, braceCount = 1
    // We want to find when braceCount goes back to 0 (closing the return object)
    let braceCount = 0;
    let returnObjEnd = -1;
    let inReturn = false;
    
    for (let i = returnStart; i < jsCode.length && i < returnStart + 8000; i++) {
      if (jsCode[i] === '{') {
        braceCount++;
        if (jsCode.substring(i, i + 8) === 'return {') {
          inReturn = true;
        }
      } else if (jsCode[i] === '}') {
        braceCount--;
        if (inReturn && braceCount === 0) {
          // This closes the return object
          returnObjEnd = i;
          break;
        }
      }
    }
    
    if (returnObjEnd === -1) {
      console.error('❌ Could not find closing brace of return object');
      process.exit(1);
    }
    
    // Check what's right before the closing brace
    const beforeClose = jsCode.substring(Math.max(0, returnObjEnd - 200), returnObjEnd);
    console.log('Before closing brace (last 200 chars):');
    console.log(beforeClose);
    
    // Check if methods already exist
    if (beforeClose.includes('showOverlayHtml:') || beforeClose.includes('hideOverlayHtml:')) {
      console.log('✅ Methods already exist in return object');
      await queryRunner.release();
      await dataSource.destroy();
      return;
    }
    
    // Add methods right before the closing brace
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
    
    jsCode = jsCode.substring(0, returnObjEnd) + newMethods + '\n          ' + jsCode.substring(returnObjEnd);
    
    // Escape and update
    const escaped = jsCode.replace(/'/g, "''");
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escaped}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Added methods to return object in createIframeAISDK');
    
    // Verify
    const verifyResult = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    const verifyCode = verifyResult[0].js_code;
    const sdkStart2 = verifyCode.indexOf('const createIframeAISDK = () => {');
    const returnStart2 = verifyCode.indexOf('return {', sdkStart2);
    let braceCount2 = 0;
    let returnObjEnd2 = -1;
    let inReturn2 = false;
    for (let i = returnStart2; i < verifyCode.length && i < returnStart2 + 8000; i++) {
      if (verifyCode[i] === '{') {
        braceCount2++;
        if (verifyCode.substring(i, i + 8) === 'return {') inReturn2 = true;
      } else if (verifyCode[i] === '}') {
        braceCount2--;
        if (inReturn2 && braceCount2 === 0) {
          returnObjEnd2 = i;
          break;
        }
      }
    }
    if (returnObjEnd2 !== -1) {
      const returnObj = verifyCode.substring(returnStart2, returnObjEnd2);
      console.log('✅ Verification: return object has showOverlayHtml:', returnObj.includes('showOverlayHtml'));
      console.log('✅ Verification: return object has hideOverlayHtml:', returnObj.includes('hideOverlayHtml'));
    }
    
    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

addMethods();


