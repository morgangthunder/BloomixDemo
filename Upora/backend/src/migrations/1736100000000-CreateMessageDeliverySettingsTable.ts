import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates message_delivery_settings table for Super Admin configuration of
 * N8N webhook URL and optional email from name/address (used when "Also send by email" is checked).
 */
export class CreateMessageDeliverySettingsTable1736100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "message_delivery_settings" (
        "id" varchar(64) PRIMARY KEY DEFAULT 'default',
        "n8n_webhook_url" varchar(2048),
        "email_from_name" varchar(255),
        "email_from_address" varchar(255),
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      INSERT INTO "message_delivery_settings" ("id", "n8n_webhook_url", "email_from_name", "email_from_address", "updated_at")
      VALUES ('default', NULL, NULL, NULL, CURRENT_TIMESTAMP)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "message_delivery_settings"`);
  }
}
