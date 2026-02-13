// Script to manually run TypeORM migrations
// Usage: node scripts/run-migrations.js
// Optional: BACKFILL_MIGRATIONS=1 to mark pre-existing migrations as run (when DB was synced manually).

const { DataSource } = require('typeorm');
const path = require('path');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'upora_user',
  password: process.env.DATABASE_PASSWORD || 'upora_password',
  database: process.env.DATABASE_NAME || 'upora_dev',
  entities: [path.join(__dirname, '../dist/**/*.entity.js')],
  migrations: [path.join(__dirname, '../dist/migrations/*.js')],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
});

// All migrations before AddOverlayCodeToSDKTestIframe (1735600000000). Used for backfill when DB already has schema.
const MIGRATIONS_BEFORE_OVERLAY = [
  [1730000000000, 'AddYouTubeFieldsToProcessedContent1730000000000'],
  [1731105000000, 'CreateInteractionTypes1731105000000'],
  [1734371654000, 'AddAISDKFieldsToInteractionTypes1734371654000'],
  [1734500000000, 'AddDataStorageSchemasToInteractionTypes1734500000000'],
  [1734500001000, 'CreateInteractionDataStorageTables1734500001000'],
  [1734500002000, 'CreateSDKTestPixiJSInteraction1734500002000'],
  [1734500003000, 'CreateSDKTestHTMLInteraction1734500003000'],
  [1734500004000, 'CreateSDKTestIframeInteraction1734500004000'],
  [1734600000000, 'AddMediaConfigToInteractionTypes1734600000000'],
  [1734600001000, 'CreateSDKTestMediaPlayerInteraction1734600001000'],
  [1734600002000, 'UpdatePromptsMediaPlayerSDK1734600002000'],
  [1734600003000, 'AddOverlayMethodsToPrompts1734600003000'],
  [1735000000000, 'UpdateSDKTestIframeSampleData1735000000000'],
  [1735100000000, 'CreateVideoUrlInteractionType1735100000000'],
  [1735100001000, 'CreateSDKTestVideoUrlInteraction1735100001000'],
  [1735100002000, 'AddVideoUrlConfigToInteractionTypes1735100002000'],
  [1735200000000, 'CreateGeneratedImagesTable1735200000000'],
  [1735300000000, 'CreateUserPersonalizationTables1735300000000'],
  [1735400000000, 'FixPersonalizationOptionsUniqueConstraint1735400000000'],
  [1735500000000, 'AddUserManagementTables1735500000000'],
];

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('✅ DataSource initialized');

    if (process.env.BACKFILL_MIGRATIONS === '1') {
      console.log('Backfilling migration history (marking pre-1735600000000 as run)...');
      for (const [ts, name] of MIGRATIONS_BEFORE_OVERLAY) {
        await dataSource.query(
          `INSERT INTO migrations (timestamp, name) SELECT $1::bigint, $2::text WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE timestamp = $1 AND name = $2::text)`,
          [ts, name],
        );
      }
      console.log('✅ Backfill done');
    }

    const migrations = await dataSource.runMigrations();
    console.log(`✅ Ran ${migrations.length} migrations`);

    migrations.forEach((migration) => {
      console.log(`  - ${migration.name}`);
    });

    await dataSource.destroy();
    console.log('✅ DataSource destroyed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigrations();

