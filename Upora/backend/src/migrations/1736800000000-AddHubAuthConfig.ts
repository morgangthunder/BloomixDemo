import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHubAuthConfig1736800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add auth_config JSONB to hubs table
    await queryRunner.query(`
      ALTER TABLE hubs ADD COLUMN IF NOT EXISTS auth_config JSONB
    `);

    // Add auth_provider and auth_provider_sub to users table
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(255) DEFAULT 'cognito'
    `);
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_sub VARCHAR(500)
    `);

    // Index for SSO user lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_auth_provider_sub
      ON users(auth_provider, auth_provider_sub) WHERE auth_provider_sub IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_auth_provider_sub`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS auth_provider_sub`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS auth_provider`);
    await queryRunner.query(`ALTER TABLE hubs DROP COLUMN IF EXISTS auth_config`);
  }
}
