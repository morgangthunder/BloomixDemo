// Add methods after getUserPublicProfile in createIframeAISDK
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
    
    // Find getUserPublicProfile and add methods right after it
    // Look for the closing of getUserPublicProfile method
    const getUserPublicProfileEnd = jsCode.indexOf('getUserPublicProfile');
    if (getUserPublicProfileEnd === -1) {
      console.error('❌ Could not find getUserPublicProfile');
      process.exit(1);
    }
    
    // Find the end of this method (look for the closing }, that ends the method)
    // The pattern is: getUserPublicProfile: (userId, callback) => { ... },
    let methodEnd = getUserPublicProfileEnd;
    let braceCount = 0;
    let inMethod = false;
    let foundEnd = false;
    
    for (let i = getUserPublicProfileEnd; i < jsCode.length && i < getUserPublicProfileEnd + 500; i++) {
      if (jsCode[i] === '{') {
        braceCount++;
        inMethod = true;
      } else if (jsCode[i] === '}') {
        braceCount--;
        if (inMethod && braceCount === 0) {
          // Found the closing brace of the method
          // Now look for the comma after it
          for (let j = i + 1; j < jsCode.length && j < i + 10; j++) {
            if (jsCode[j] === ',') {
              methodEnd = j + 1;
              foundEnd = true;
              break;
            }
          }
          if (foundEnd) break;
        }
      }
    }
    
    if (!foundEnd) {
      console.error('❌ Could not find end of getUserPublicProfile method');
      process.exit(1);
    }
    
    // Check if methods already exist after this
    const afterMethod = jsCode.substring(methodEnd, methodEnd + 100);
    if (afterMethod.includes('playMedia:') || afterMethod.includes('showOverlayHtml:')) {
      console.log('✅ Methods already exist after getUserPublicProfile');
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
    const sdkMatch = verifyCode.match(/const createIframeAISDK = \(\) => \{[\s\S]*?\};/);
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


