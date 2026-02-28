import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccessControlColumns1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lessons ADD COLUMN IF NOT EXISTS access_level VARCHAR(20) DEFAULT 'public'
    `);
    await queryRunner.query(`
      ALTER TABLE lessons ADD COLUMN IF NOT EXISTS required_subscription_tier VARCHAR(20)
    `);
    await queryRunner.query(`
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS access_level VARCHAR(20) DEFAULT 'public'
    `);
    await queryRunner.query(`
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS required_subscription_tier VARCHAR(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE courses DROP COLUMN IF EXISTS required_subscription_tier`);
    await queryRunner.query(`ALTER TABLE courses DROP COLUMN IF EXISTS access_level`);
    await queryRunner.query(`ALTER TABLE lessons DROP COLUMN IF EXISTS required_subscription_tier`);
    await queryRunner.query(`ALTER TABLE lessons DROP COLUMN IF EXISTS access_level`);
  }
}
