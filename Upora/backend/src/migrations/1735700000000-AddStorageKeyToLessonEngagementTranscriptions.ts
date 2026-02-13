import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds storage_key to lesson_engagement_transcriptions for MinIO/S3 transcript storage.
 * When set, the full transcript is stored at that key; DB transcript column may be empty.
 */
export class AddStorageKeyToLessonEngagementTranscriptions1735700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lesson_engagement_transcriptions"
      ADD COLUMN IF NOT EXISTS "storage_key" VARCHAR(512)
    `);
    await queryRunner.query(`
      ALTER TABLE "lesson_engagement_transcriptions"
      ADD COLUMN IF NOT EXISTS "entry_count" INTEGER DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "lesson_engagement_transcriptions"
      DROP COLUMN IF EXISTS "entry_count"
    `);
    await queryRunner.query(`
      ALTER TABLE "lesson_engagement_transcriptions"
      DROP COLUMN IF EXISTS "storage_key"
    `);
  }
}
