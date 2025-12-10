// Check the length of js_code stored in database
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
});

async function checkCode() {
  try {
    await dataSource.initialize();
    console.log('✅ DataSource initialized');
    
    const result = await dataSource.query(
      `SELECT 
        LENGTH(js_code) as len, 
        SUBSTRING(js_code, 1, 100) as start, 
        SUBSTRING(js_code, LENGTH(js_code) - 100) as end 
      FROM interaction_types 
      WHERE id = 'sdk-test-media-player'`
    );
    
    if (result.length > 0) {
      console.log('📊 JavaScript code in database:');
      console.log('Length:', result[0].len, 'characters');
      console.log('First 100 chars:', result[0].start);
      console.log('Last 100 chars:', result[0].end);
      console.log('Contains "All buttons created":', result[0].end?.includes('All buttons created') || result[0].start?.includes('All buttons created'));
    } else {
      console.log('❌ Interaction type not found');
    }
    
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCode();


