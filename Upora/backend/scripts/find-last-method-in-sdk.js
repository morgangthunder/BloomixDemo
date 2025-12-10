// Find the last method in createIframeAISDK
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

async function findLastMethod() {
  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    
    const result = await queryRunner.query(`
      SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'
    `);
    
    const jsCode = result[0].js_code;
    
    // Find createIframeAISDK
    const createIframeMatch = jsCode.match(/const createIframeAISDK = \(\) => \{([\s\S]*?)\};/);
    if (createIframeMatch) {
      const funcBody = createIframeMatch[1];
      
      // Find the return statement and its object
      const returnMatch = funcBody.match(/return\s*\{([\s\S]*?)\};/);
      if (returnMatch) {
        const returnObj = returnMatch[1];
        
        // Find all method definitions
        const methods = returnObj.match(/\w+:\s*(\([^)]*\)\s*=>|function)/g);
        console.log('Methods found:', methods ? methods.length : 0);
        if (methods) {
          console.log('Last 10 methods:', methods.slice(-10));
        }
        
        // Show last 1000 chars before the closing brace
        console.log('\nLast 1000 chars before closing brace:');
        console.log(returnObj.substring(Math.max(0, returnObj.length - 1000)));
      }
    }
    
    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findLastMethod();


