// Quick script to add Show/Hide Overlay HTML buttons to the SDK test media player interaction
const { DataSource } = require('typeorm');
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

async function addButtons() {
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
    
    // Check if buttons already exist
    if (jsCode.includes('Show Overlay HTML')) {
      console.log('✅ Buttons already exist in database');
      await queryRunner.release();
      await dataSource.destroy();
      return;
    }
    
    // Find the insertion point (after "Is Playing?" button or before "Data Storage Methods")
    // Try multiple patterns
    let found = false;
    
    // Pattern 1: Old "Is Playing?" with const isPlaying
    const pattern1 = /createButton\("Is Playing\?", \(\) => \{[^}]*const isPlaying = aiSDK\.isMediaPlaying\(\);[^}]*addResult\("Is playing: " \+ isPlaying, "info"\);[^}]*\}\);/s;
    
    // Pattern 2: New "Is Playing?" with callback
    const pattern2 = /createButton\("Is Playing\?", \(\) => \{[^}]*aiSDK\.isMediaPlaying\(\(isPlaying\) => \{[^}]*addResult\("Is playing: " \+ isPlaying, "info"\);[^}]*\}\);[^}]*\}\);/s;
    
    // Pattern 3: Before "Data Storage Methods" section
    const pattern3 = /(\s+)(\/\/ Data Storage Methods)/;
    
    const newButtons = `
          createButton("Show Overlay HTML", () => {
            aiSDK.showOverlayHtml();
            addResult("Show overlay HTML requested", "success");
          });

          createButton("Hide Overlay HTML", () => {
            aiSDK.hideOverlayHtml();
            addResult("Hide overlay HTML requested", "success");
          });`;
    
    if (pattern1.test(jsCode)) {
      jsCode = jsCode.replace(pattern1, (match) => {
        return match + newButtons;
      });
      found = true;
    } else if (pattern2.test(jsCode)) {
      jsCode = jsCode.replace(pattern2, (match) => {
        return match + newButtons;
      });
      found = true;
    } else if (pattern3.test(jsCode)) {
      jsCode = jsCode.replace(pattern3, (match, indent, section) => {
        return newButtons + indent + section;
      });
      found = true;
    }
    
    if (found) {
      
      // Escape single quotes for SQL
      const escapedJs = jsCode.replace(/'/g, "''");
      
      await queryRunner.query(`
        UPDATE interaction_types
        SET js_code = '${escapedJs}'
        WHERE id = 'sdk-test-media-player'
      `);
      
      console.log('✅ Added Show/Hide Overlay HTML buttons to database');
    } else {
      console.error('❌ Could not find insertion point in JavaScript code');
      console.error('   Looking for "Is Playing?" button pattern');
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

addButtons();

