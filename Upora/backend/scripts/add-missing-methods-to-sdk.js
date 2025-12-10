// Add missing methods to createIframeAISDK in the database
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
    
    // Find getInstanceDataHistory method and add methods after it
    // Look for the pattern that ends getInstanceDataHistory
    const pattern = /getInstanceDataHistory:\s*\(filters,\s*callback\)\s*=>\s*\{[^}]*const filtersData = filters \? \{[\s\S]*?\} : \{\};[\s\S]*?sendMessage\("ai-sdk-get-instance-data-history"[^}]*\},[^}]*\},/;
    
    if (pattern.test(jsCode)) {
      // Check if methods already exist after this
      const afterMatch = jsCode.split(pattern)[1];
      if (!afterMatch || !afterMatch.trim().startsWith('// Media Control Methods') && !afterMatch.includes('playMedia:')) {
        // Add all missing methods
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
        
        jsCode = jsCode.replace(pattern, (match) => match + newMethods);
        console.log('✅ Added methods to createIframeAISDK');
      } else {
        console.log('✅ Methods already exist');
      }
    } else {
      console.error('❌ Could not find getInstanceDataHistory method');
      // Try a simpler pattern
      const simplePattern = /getInstanceDataHistory[^}]*\},[^}]*\},/;
      if (simplePattern.test(jsCode)) {
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
        
        jsCode = jsCode.replace(simplePattern, (match) => match + newMethods);
        console.log('✅ Added methods using simple pattern');
      } else {
        console.error('❌ Could not find insertion point');
        process.exit(1);
      }
    }
    
    // Escape and update
    const escaped = jsCode.replace(/'/g, "''");
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escaped}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Database updated');
    
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


