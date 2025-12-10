// Script to update SDK Test Media Player interaction with Code tab content
// This updates the interaction to have HTML, CSS, JS code and media config

const { DataSource } = require('typeorm');
const path = require('path');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'upora',
  entities: [path.join(__dirname, '../dist/**/*.entity.js')],
  synchronize: false,
  logging: true,
});

async function updateInteraction() {
  try {
    await dataSource.initialize();
    console.log('✅ DataSource initialized');
    
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Read the SQL file content
      const fs = require('fs');
      const sqlContent = fs.readFileSync(path.join(__dirname, 'update-sdk-test-media-player-code-tab.sql'), 'utf8');
      
      // Execute the SQL
      await queryRunner.query(sqlContent);
      
      await queryRunner.commitTransaction();
      console.log('✅ SDK Test Media Player interaction updated with Code tab content');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
    
    await dataSource.destroy();
    console.log('✅ DataSource destroyed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

updateInteraction();

