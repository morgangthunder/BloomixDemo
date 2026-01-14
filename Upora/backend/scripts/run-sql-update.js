// Script to run SQL update for true-false-selection interaction
// Usage: node scripts/run-sql-update.js

const { DataSource } = require('typeorm');
const path = require('path');
const fs = require('fs');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'upora_user',
  password: process.env.DATABASE_PASSWORD || 'upora_password',
  database: process.env.DATABASE_NAME || 'upora_dev',
  synchronize: false,
  logging: true,
});

async function runSQLUpdate() {
  try {
    await dataSource.initialize();
    console.log('✅ DataSource initialized');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '../update-true-false-complete-interaction.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        console.log(`\n📝 Executing: ${trimmed.substring(0, 100)}...`);
        await dataSource.query(trimmed);
        console.log('✅ Statement executed successfully');
      }
    }
    
    console.log('\n✅ All SQL statements executed successfully');
    
    await dataSource.destroy();
    console.log('✅ DataSource destroyed');
  } catch (error) {
    console.error('❌ SQL update error:', error);
    process.exit(1);
  }
}

runSQLUpdate();
