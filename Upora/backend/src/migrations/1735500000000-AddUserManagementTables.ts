import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds subscription_renewal_at to users and creates lesson_engagement_transcriptions table
 * for Phase 6: Shared User Management.
 */
export class AddUserManagementTables1735500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Add subscription_renewal_at to users
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "subscription_renewal_at" TIMESTAMP
    `);

    // Create lesson_engagement_transcriptions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lesson_engagement_transcriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "lesson_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "user_session_id" uuid,
        "transcript" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_lesson_engagement_transcriptions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lesson_engagement_transcriptions_user_id"
      ON "lesson_engagement_transcriptions" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_lesson_engagement_transcriptions_lesson_id"
      ON "lesson_engagement_transcriptions" ("lesson_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson_engagement_transcriptions"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "subscription_renewal_at"`);
  }
}
