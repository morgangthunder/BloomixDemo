// Script to update SDK Test Media Player interaction with complete JavaScript code
// This ensures showOverlayHtml and hideOverlayHtml methods are in the createIframeAISDK function
const { DataSource } = require('typeorm');
const path = require('path');
const fs = require('fs');

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

async function updateCode() {
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');
    
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // Get current js_code
    const result = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    
    if (!result || result.length === 0) {
      console.error('❌ Interaction not found');
      process.exit(1);
    }
    
    let jsCode = result[0].js_code;
    
    // Check if showOverlayHtml and hideOverlayHtml are already in createIframeAISDK
    if (jsCode.includes('showOverlayHtml: () => {') && jsCode.includes('hideOverlayHtml: () => {')) {
      console.log('✅ showOverlayHtml and hideOverlayHtml already exist in createIframeAISDK');
      
      // Verify they're in the right place (inside createIframeAISDK, not just anywhere)
      const createIframeAISDKMatch = jsCode.match(/const createIframeAISDK = \(\) => \{[\s\S]*?\};/);
      if (createIframeAISDKMatch && createIframeAISDKMatch[0].includes('showOverlayHtml') && createIframeAISDKMatch[0].includes('hideOverlayHtml')) {
        console.log('✅ Methods are correctly placed in createIframeAISDK function');
        await queryRunner.release();
        await dataSource.destroy();
        return;
      }
    }
    
    // Find the createIframeAISDK function and add the methods if missing
    // Look for the pattern: isMediaPlaying: (callback) => { ... },
    const isMediaPlayingPattern = /isMediaPlaying:\s*\(callback\)\s*=>\s*\{[^}]*sendMessage\("ai-sdk-is-media-playing"[^}]*\},[^}]*\},/;
    
    if (isMediaPlayingPattern.test(jsCode)) {
      // Check if showOverlayHtml and hideOverlayHtml come after isMediaPlaying
      const afterIsMediaPlaying = jsCode.split(isMediaPlayingPattern)[1];
      if (!afterIsMediaPlaying || !afterIsMediaPlaying.includes('showOverlayHtml')) {
        // Add the methods after isMediaPlaying
        const newMethods = `
            showOverlayHtml: () => {
              sendMessage("ai-sdk-show-overlay-html", {});
            },
            hideOverlayHtml: () => {
              sendMessage("ai-sdk-hide-overlay-html", {});
            },`;
        
        jsCode = jsCode.replace(
          /(isMediaPlaying:\s*\(callback\)\s*=>\s*\{[^}]*sendMessage\("ai-sdk-is-media-playing"[^}]*\},[^}]*\},)/,
          `$1${newMethods}`
        );
        
        console.log('✅ Added showOverlayHtml and hideOverlayHtml methods to createIframeAISDK');
      }
    } else {
      // Try a different pattern - look for the closing brace of the return object
      // Find where isMediaPlaying ends and add methods before the closing brace
      const returnObjectPattern = /return\s*\{[\s\S]*?isMediaPlaying:\s*\(callback\)\s*=>\s*\{[^}]*sendMessage\("ai-sdk-is-media-playing"[^}]*\},[^}]*\},([\s\S]*?)\};/;
      
      if (returnObjectPattern.test(jsCode)) {
        const match = jsCode.match(returnObjectPattern);
        if (match && !match[1].includes('showOverlayHtml')) {
          const newMethods = `
            showOverlayHtml: () => {
              sendMessage("ai-sdk-show-overlay-html", {});
            },
            hideOverlayHtml: () => {
              sendMessage("ai-sdk-hide-overlay-html", {});
            },`;
          
          jsCode = jsCode.replace(
            /(isMediaPlaying:\s*\(callback\)\s*=>\s*\{[^}]*sendMessage\("ai-sdk-is-media-playing"[^}]*\},[^}]*\},)/,
            `$1${newMethods}`
          );
          
          console.log('✅ Added showOverlayHtml and hideOverlayHtml methods to createIframeAISDK (pattern 2)');
        }
      } else {
        console.error('❌ Could not find isMediaPlaying method in createIframeAISDK');
        console.error('   This suggests the code structure is different than expected');
        process.exit(1);
      }
    }
    
    // Escape single quotes for SQL
    const escapedJs = jsCode.replace(/'/g, "''");
    
    await queryRunner.query(`
      UPDATE interaction_types
      SET js_code = '${escapedJs}'
      WHERE id = 'sdk-test-media-player'
    `);
    
    console.log('✅ Updated JavaScript code in database');
    
    // Verify the update
    const verifyResult = await queryRunner.query(`
      SELECT js_code LIKE '%showOverlayHtml%' as has_show, 
             js_code LIKE '%hideOverlayHtml%' as has_hide
      FROM interaction_types 
      WHERE id = 'sdk-test-media-player'
    `);
    
    if (verifyResult[0].has_show && verifyResult[0].has_hide) {
      console.log('✅ Verification: Both methods are now in the database');
    } else {
      console.error('❌ Verification failed: Methods not found after update');
      process.exit(1);
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

updateCode();


