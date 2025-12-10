// Script to add showOverlayHtml and hideOverlayHtml (and media methods) to createIframeAISDK
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
    
    if (!result || result.length === 0) {
      console.error('❌ Interaction not found');
      process.exit(1);
    }
    
    let jsCode = result[0].js_code;
    
    // Find the end of the return object in createIframeAISDK
    // Look for getUserPublicProfile which should be near the end
    const getUserPublicProfilePattern = /getUserPublicProfile:\s*\(userId,\s*callback\)\s*=>\s*\{[^}]*sendMessage\("ai-sdk-get-user-public-profile"[^}]*\},[^}]*\},/;
    
    if (getUserPublicProfilePattern.test(jsCode)) {
      // Check if media methods already exist after getUserPublicProfile
      const afterGetUserPublicProfile = jsCode.split(getUserPublicProfilePattern)[1];
      if (!afterGetUserPublicProfile || !afterGetUserPublicProfile.trim().startsWith('// Media Control Methods')) {
        // Add all media methods and overlay methods
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
        
        jsCode = jsCode.replace(
          getUserPublicProfilePattern,
          (match) => match + newMethods
        );
        
        console.log('✅ Added media control and overlay methods to createIframeAISDK');
      } else {
        console.log('✅ Methods already exist after getUserPublicProfile');
      }
    } else {
      console.error('❌ Could not find getUserPublicProfile method');
      process.exit(1);
    }
    
    // Escape single quotes for SQL
    const escapedJs = jsCode.replace(/'/g, "''");
    
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escapedJs}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Updated JavaScript code in database');
    
    // Verify
    const verifyResult = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    const verifyCode = verifyResult[0].js_code;
    const createIframeMatch = verifyCode.match(/const createIframeAISDK = \(\) => \{[\s\S]{0,10000}\};/);
    if (createIframeMatch) {
      const funcCode = createIframeMatch[0];
      console.log('✅ Verification: createIframeAISDK has showOverlayHtml:', funcCode.includes('showOverlayHtml'));
      console.log('✅ Verification: createIframeAISDK has hideOverlayHtml:', funcCode.includes('hideOverlayHtml'));
    }
    
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


