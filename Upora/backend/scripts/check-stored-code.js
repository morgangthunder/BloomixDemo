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

async function check() {
  try {
    await dataSource.initialize();
    console.log('✅ DataSource initialized\n');
    
    const result = await dataSource.query(
      "SELECT LENGTH(js_code) as len, SUBSTRING(js_code, 1, 200) as start, SUBSTRING(js_code, LENGTH(js_code) - 200) as end FROM interaction_types WHERE id = 'sdk-test-media-player'"
    );
    
    if (result.length > 0) {
      console.log('========================================');
      console.log('DATABASE CODE CHECK');
      console.log('========================================');
      console.log(`Length: ${result[0].len} characters`);
      console.log(`Expected: ~5000+ characters`);
      console.log(`\nFirst 200 chars:`);
      console.log(result[0].start);
      console.log(`\nLast 200 chars:`);
      console.log(result[0].end);
      console.log(`\nContains "All buttons created": ${result[0].end?.includes('All buttons created') || result[0].start?.includes('All buttons created') ? 'YES' : 'NO'}`);
      console.log(`Contains "generateRequestId": ${result[0].start?.includes('generateRequestId') ? 'YES' : 'NO'}`);
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

check();


