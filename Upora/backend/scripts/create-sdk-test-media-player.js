// Script to create SDK Test Media Player interaction
// This runs the migration code directly

const { DataSource } = require('typeorm');
const path = require('path');

// Import the migration class
const { CreateSDKTestMediaPlayerInteraction1734600001000 } = require('../dist/migrations/1734600001000-CreateSDKTestMediaPlayerInteraction.js');

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

async function createInteraction() {
  try {
    await dataSource.initialize();
    console.log('✅ DataSource initialized');
    
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const migration = new CreateSDKTestMediaPlayerInteraction1734600001000();
      await migration.up(queryRunner);
      await queryRunner.commitTransaction();
      console.log('✅ SDK Test Media Player interaction created');
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

createInteraction();

