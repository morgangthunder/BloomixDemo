import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendGroupsForCourses1736600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make lesson_id nullable (was NOT NULL)
    await queryRunner.query(`ALTER TABLE lesson_groups ALTER COLUMN lesson_id DROP NOT NULL`);

    // Add course_id column
    await queryRunner.query(`
      ALTER TABLE lesson_groups
      ADD COLUMN IF NOT EXISTS course_id UUID NULL REFERENCES courses(id) ON DELETE CASCADE
    `);

    // Add parent_course_group_id column (self-reference)
    await queryRunner.query(`
      ALTER TABLE lesson_groups
      ADD COLUMN IF NOT EXISTS parent_course_group_id UUID NULL REFERENCES lesson_groups(id) ON DELETE CASCADE
    `);

    // Add indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lesson_groups_course_id ON lesson_groups(course_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lesson_groups_parent_cg_id ON lesson_groups(parent_course_group_id)`);

    // Add email column to group_members for invite-by-email
    await queryRunner.query(`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS email VARCHAR(320) NULL`);

    // Add status column to group_members (invited, joined, declined)
    await queryRunner.query(`ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'joined'`);

    // Make user_id nullable in group_members (for email-only invites)
    await queryRunner.query(`ALTER TABLE group_members ALTER COLUMN user_id DROP NOT NULL`);

    // Drop the existing unique constraint that requires user_id (it can be null now)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_group_members_groupId_userId"`);
    // Create a partial unique index that only applies when user_id is not null
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_group_user_unique
      ON group_members(group_id, user_id)
      WHERE user_id IS NOT NULL
    `);

    // Create course_group_lesson_visibility table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS course_group_lesson_visibility (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_group_id UUID NOT NULL REFERENCES lesson_groups(id) ON DELETE CASCADE,
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        is_visible BOOLEAN NOT NULL DEFAULT true,
        UNIQUE(course_group_id, lesson_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS course_group_lesson_visibility`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_group_members_group_user_unique`);
    await queryRunner.query(`ALTER TABLE group_members ALTER COLUMN user_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE group_members DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE group_members DROP COLUMN IF EXISTS email`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lesson_groups_parent_cg_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lesson_groups_course_id`);
    await queryRunner.query(`ALTER TABLE lesson_groups DROP COLUMN IF EXISTS parent_course_group_id`);
    await queryRunner.query(`ALTER TABLE lesson_groups DROP COLUMN IF EXISTS course_id`);
    await queryRunner.query(`ALTER TABLE lesson_groups ALTER COLUMN lesson_id SET NOT NULL`);
  }
}
