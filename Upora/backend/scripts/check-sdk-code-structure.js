// Quick script to check the structure of the SDK code in the database
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

async function checkCode() {
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
    
    const jsCode = result[0].js_code;
    console.log('Code length:', jsCode.length);
    console.log('Has showOverlayHtml:', jsCode.includes('showOverlayHtml'));
    console.log('Has hideOverlayHtml:', jsCode.includes('hideOverlayHtml'));
    console.log('Has isMediaPlaying:', jsCode.includes('isMediaPlaying'));
    
    // Find the createIframeAISDK function
    const createIframeMatch = jsCode.match(/const createIframeAISDK = \(\) => \{[\s\S]{0,5000}\};/);
    if (createIframeMatch) {
      const funcCode = createIframeMatch[0];
      console.log('\ncreateIframeAISDK function length:', funcCode.length);
      console.log('Function has showOverlayHtml:', funcCode.includes('showOverlayHtml'));
      console.log('Function has hideOverlayHtml:', funcCode.includes('hideOverlayHtml'));
      
      // Show last 500 chars of the function
      console.log('\nLast 500 chars of createIframeAISDK:');
      console.log(funcCode.substring(Math.max(0, funcCode.length - 500)));
    } else {
      console.log('\n❌ Could not find createIframeAISDK function');
    }
    
    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCode();


