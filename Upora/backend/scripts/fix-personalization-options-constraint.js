// Fix 23505: Drop UNIQUE(category), add UNIQUE(category, age_range, gender)
const { DataSource } = require('typeorm');
const path = require('path');
const fs = require('fs');

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
  const sql = fs.readFileSync(path.join(__dirname, 'fix-personalization-options-constraint.sql'), 'utf8');
  const statements = sql.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
  for (const st of statements) {
    const t = st.trim();
    if (t) await ds.query(t);
  }
  await ds.destroy();
  console.log('Fixed personalization_options unique constraint');
}
run().catch(e => { console.error(e); process.exit(1); });
