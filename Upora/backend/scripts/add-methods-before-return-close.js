// Add methods before the closing brace of the return object in createIframeAISDK
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
    
    // Find createIframeAISDK and its return statement
    const sdkStart = jsCode.indexOf('const createIframeAISDK = () => {');
    if (sdkStart === -1) {
      console.error('❌ Could not find createIframeAISDK');
      process.exit(1);
    }
    
    // Find "return {" within createIframeAISDK
    const returnStart = jsCode.indexOf('return {', sdkStart);
    if (returnStart === -1) {
      console.error('❌ Could not find return statement');
      process.exit(1);
    }
    
    // Find the closing brace of the return object
    // Look for the pattern: }, }; (closing brace of return object, then closing brace + semicolon of function)
    // We need to find the }; that closes the function, then work backwards
    
    // Find all occurrences of "};" after returnStart
    const candidates = [];
    for (let i = returnStart; i < jsCode.length && i < returnStart + 10000; i++) {
      if (jsCode.substring(i, i + 2) === '};') {
        candidates.push(i);
      }
    }
    
    // The last }; before we exit createIframeAISDK should be the function's closing
    // But we want the one before that, which closes the return object
    // Actually, let's find getUserPublicProfile and add after it
    const getUserPublicProfileIdx = jsCode.indexOf('getUserPublicProfile:', returnStart);
    if (getUserPublicProfileIdx === -1) {
      console.error('❌ Could not find getUserPublicProfile');
      process.exit(1);
    }
    
    // Find the end of getUserPublicProfile method (look for }, that closes it)
    let methodEnd = -1;
    let braceCount = 0;
    let foundOpening = false;
    
    for (let i = getUserPublicProfileIdx; i < jsCode.length && i < getUserPublicProfileIdx + 300; i++) {
      if (jsCode[i] === '{') {
        braceCount++;
        foundOpening = true;
      } else if (jsCode[i] === '}') {
        braceCount--;
        if (foundOpening && braceCount === 0) {
          // Found closing brace, now look for comma
          for (let j = i + 1; j < jsCode.length && j < i + 5; j++) {
            if (jsCode[j] === ',') {
              methodEnd = j + 1;
              break;
            }
          }
          if (methodEnd !== -1) break;
        }
      }
    }
    
    if (methodEnd === -1) {
      console.error('❌ Could not find end of getUserPublicProfile method');
      process.exit(1);
    }
    
    // Check what comes after
    const after = jsCode.substring(methodEnd, methodEnd + 50);
    console.log('After getUserPublicProfile:', after);
    
    if (after.includes('playMedia') || after.includes('showOverlayHtml')) {
      console.log('✅ Methods already exist');
      await queryRunner.release();
      await dataSource.destroy();
      return;
    }
    
    // Add methods
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
            },`;
    
    jsCode = jsCode.substring(0, methodEnd) + newMethods + jsCode.substring(methodEnd);
    
    // Escape and update
    const escaped = jsCode.replace(/'/g, "''");
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escaped}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Added methods to createIframeAISDK');
    
    // Verify
    const verifyResult = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    const verifyCode = verifyResult[0].js_code;
    const sdkMatch = verifyCode.match(/const createIframeAISDK = \(\) => \{[\s\S]{0,6000}\};/);
    if (sdkMatch) {
      console.log('✅ Verification: createIframeAISDK has showOverlayHtml:', sdkMatch[0].includes('showOverlayHtml'));
      console.log('✅ Verification: createIframeAISDK has hideOverlayHtml:', sdkMatch[0].includes('hideOverlayHtml'));
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


