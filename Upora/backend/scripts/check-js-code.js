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
    const result = await dataSource.query(
      "SELECT LENGTH(js_code) as len, SUBSTRING(js_code, LENGTH(js_code) - 100) as end FROM interaction_types WHERE id = 'sdk-test-media-player'"
    );
    console.log('Length:', result[0].len);
    console.log('Last 100 chars:', result[0].end);
    console.log('Contains "All buttons created":', result[0].end?.includes('All buttons created') || 'N/A');
    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

check();


