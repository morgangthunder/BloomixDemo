// Find where to insert methods in createIframeAISDK
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

async function findPoint() {
  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    const result = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    
    const jsCode = result[0].js_code;
    
    // Find createIframeAISDK
    const sdkStart = jsCode.indexOf('const createIframeAISDK = () => {');
    const sdkEnd = jsCode.indexOf('};', sdkStart + 100);
    
    if (sdkStart === -1 || sdkEnd === -1) {
      console.error('❌ Could not find createIframeAISDK');
      process.exit(1);
    }
    
    const sdkCode = jsCode.substring(sdkStart, sdkEnd + 2);
    
    // Find the return statement
    const returnStart = sdkCode.indexOf('return {');
    const returnEnd = sdkCode.lastIndexOf('};', sdkCode.length - 3);
    
    if (returnStart === -1 || returnEnd === -1) {
      console.error('❌ Could not find return object');
      process.exit(1);
    }
    
    const returnObj = sdkCode.substring(returnStart, returnEnd);
    
    // Show last 500 chars
    console.log('Last 500 chars of return object:');
    console.log(returnObj.substring(Math.max(0, returnObj.length - 500)));
    
    // Find last method
    const methods = returnObj.match(/\w+:\s*(\([^)]*\)\s*=>|function)/g);
    if (methods) {
      console.log('\nLast 5 methods:', methods.slice(-5));
    }
    
    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findPoint();


