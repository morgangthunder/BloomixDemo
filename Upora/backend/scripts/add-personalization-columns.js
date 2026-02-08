// Add missing age_range and gender columns to personalization_options
const { DataSource } = require('typeorm');

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'upora_user',
  password: process.env.DATABASE_PASSWORD || 'upora_password',
  database: process.env.DATABASE_NAME || 'upora_dev',
  synchronize: false,
});

async function run() {
  await ds.initialize();
  await ds.query(`ALTER TABLE personalization_options ADD COLUMN IF NOT EXISTS age_range varchar(50) NOT NULL DEFAULT ''`);
  await ds.query(`ALTER TABLE personalization_options ADD COLUMN IF NOT EXISTS gender varchar(50) NOT NULL DEFAULT ''`);
  await ds.destroy();
  console.log('Added age_range and gender columns to personalization_options');
}
run().catch(e => { console.error(e); process.exit(1); });
