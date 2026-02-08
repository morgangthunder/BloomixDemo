// Inspect actual DB columns for users, user_personalization, personalization_options
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
  const r = await ds.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema='public' 
    AND table_name IN ('users','user_personalization','personalization_options')
    ORDER BY table_name, ordinal_position
  `);
  console.log(JSON.stringify(r, null, 2));
  await ds.destroy();
}
run().catch(e => { console.error(e); process.exit(1); });
