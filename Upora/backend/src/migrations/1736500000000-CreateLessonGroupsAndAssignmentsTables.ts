import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates tables for Phase 6.6+6.8: Lesson Groups, Assignments, Submissions, Deadlines.
 */
export class CreateLessonGroupsAndAssignmentsTables1736500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Lesson Groups ───
    await queryRunner.query(`
      CREATE TABLE "lesson_groups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "lesson_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "is_default" boolean NOT NULL DEFAULT false,
        "tenant_id" varchar(128),
        "created_by" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_lesson_groups_lesson" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lesson_groups_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_groups_lesson_id" ON "lesson_groups" ("lesson_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_groups_created_by" ON "lesson_groups" ("created_by")`);
    await queryRunner.query(`CREATE INDEX "IDX_lesson_groups_lesson_default" ON "lesson_groups" ("lesson_id", "is_default")`);

    // ─── Group Members (custom groups only; default groups derive membership dynamically) ───
    await queryRunner.query(`
      CREATE TABLE "group_members" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "group_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(32) NOT NULL DEFAULT 'member',
        "invited_by" uuid,
        "invited_at" timestamp,
        "joined_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_group_members_group" FOREIGN KEY ("group_id") REFERENCES "lesson_groups"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_group_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_group_members_invited_by" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_group_members_group_user" UNIQUE ("group_id", "user_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_group_members_group_id" ON "group_members" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_group_members_user_id" ON "group_members" ("user_id")`);

    // ─── Assignments ───
    await queryRunner.query(`
      CREATE TABLE "assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "lesson_id" uuid NOT NULL,
        "group_id" uuid,
        "title" varchar(255) NOT NULL,
        "description" text,
        "type" varchar(32) NOT NULL DEFAULT 'offline',
        "allowed_file_types" varchar(255),
        "max_file_size_bytes" int DEFAULT 52428800,
        "max_score" int NOT NULL DEFAULT 100,
        "stage_id" varchar(255),
        "substage_id" varchar(255),
        "sort_order" int NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT true,
        "created_by" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_assignments_lesson" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignments_group" FOREIGN KEY ("group_id") REFERENCES "lesson_groups"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_assignments_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_assignments_lesson_id" ON "assignments" ("lesson_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_assignments_group_id" ON "assignments" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_assignments_created_by" ON "assignments" ("created_by")`);

    // ─── Assignment Submissions ───
    await queryRunner.query(`
      CREATE TABLE "assignment_submissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "assignment_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'not_started',
        "file_url" text,
        "file_name" varchar(512),
        "file_size" int,
        "student_comment" text,
        "score" int,
        "grader_feedback" text,
        "graded_by" uuid,
        "graded_at" timestamp,
        "submitted_at" timestamp,
        "is_late" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_submissions_assignment" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submissions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submissions_grader" FOREIGN KEY ("graded_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_submissions_assignment_id" ON "assignment_submissions" ("assignment_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_submissions_user_id" ON "assignment_submissions" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_submissions_assignment_user" ON "assignment_submissions" ("assignment_id", "user_id")`);

    // ─── User Lesson Deadlines ───
    await queryRunner.query(`
      CREATE TABLE "user_lesson_deadlines" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "lesson_id" uuid NOT NULL,
        "group_id" uuid,
        "course_id" uuid,
        "deadline_at" timestamp NOT NULL,
        "set_by_user_id" uuid NOT NULL,
        "note" text,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_deadlines_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_deadlines_lesson" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_deadlines_group" FOREIGN KEY ("group_id") REFERENCES "lesson_groups"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_deadlines_set_by" FOREIGN KEY ("set_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_deadlines_user_id" ON "user_lesson_deadlines" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_deadlines_lesson_id" ON "user_lesson_deadlines" ("lesson_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_deadlines_user_lesson" ON "user_lesson_deadlines" ("user_id", "lesson_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_deadlines_group_id" ON "user_lesson_deadlines" ("group_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_lesson_deadlines" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assignment_submissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assignments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "group_members" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lesson_groups" CASCADE`);
  }
}
