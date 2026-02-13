import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates notifications table for Phase 6.5 Messaging.
 * Supports direct_message and other notification types (new_content_released, admin_announcement, etc.).
 */
export class CreateNotificationsTable1736000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for notification types
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'direct_message',
        'new_content_released',
        'admin_announcement',
        'progress_reminder',
        'assignment_score_update',
        'hub_invite',
        'assignment_marked_done',
        'deadline_reminder'
      )
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "hub_id" uuid,
        "type" notification_type_enum NOT NULL,
        "title" varchar(255) NOT NULL,
        "body" text,
        "action_url" varchar(500),
        "from_user_id" uuid,
        "to_user_id" uuid,
        "read_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_from_user" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notifications_to_user" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id_read_at" ON "notifications" ("user_id", "read_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id_type" ON "notifications" ("user_id", "type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_to_user_id_type" ON "notifications" ("to_user_id", "type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
  }
}
