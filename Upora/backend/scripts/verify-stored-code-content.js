const { DataSource } = require('typeorm');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'upora',
  synchronize: false,
});

async function verify() {
  try {
    await dataSource.initialize();
    console.log('✅ DataSource initialized\n');
    
    const result = await dataSource.query(
      "SELECT js_code FROM interaction_types WHERE id = 'sdk-test-media-player'"
    );
    
    if (result.length > 0) {
      const code = result[0].js_code;
      console.log('========================================');
      console.log('CODE CONTENT VERIFICATION');
      console.log('========================================');
      console.log(`Length: ${code.length} characters`);
      console.log(`Contains "All buttons created": ${code.includes('All buttons created') ? 'YES ✅' : 'NO ❌'}`);
      console.log(`Contains "generateRequestId": ${code.includes('generateRequestId') ? 'YES ✅' : 'NO ❌'}`);
      console.log(`Contains "initTestApp": ${code.includes('initTestApp') ? 'YES ✅' : 'NO ❌'}`);
      console.log(`Contains "})();": ${code.includes('})();') ? 'YES ✅' : 'NO ❌'}`);
      console.log(`Contains "createIframeAISDK": ${code.includes('createIframeAISDK') ? 'YES ✅' : 'NO ❌'}`);
      console.log('========================================\n');
    } else {
      console.log('❌ Interaction type not found');
    }
    
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();


