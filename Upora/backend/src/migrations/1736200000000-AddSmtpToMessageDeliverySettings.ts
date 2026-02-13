import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add SMTP fields and email_delivery_method to message_delivery_settings.
 * Allows sending "Also send by email" via SMTP (e.g. SMTP2GO, Google) or N8N webhook.
 */
export class AddSmtpToMessageDeliverySettings1736200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message_delivery_settings"
      ADD COLUMN IF NOT EXISTS "email_delivery_method" varchar(32) NOT NULL DEFAULT 'n8n_webhook'
    `);
    await queryRunner.query(`
      ALTER TABLE "message_delivery_settings"
      ADD COLUMN IF NOT EXISTS "smtp_host" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "message_delivery_settings"
      ADD COLUMN IF NOT EXISTS "smtp_port" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "message_delivery_settings"
      ADD COLUMN IF NOT EXISTS "smtp_secure" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "message_delivery_settings"
      ADD COLUMN IF NOT EXISTS "smtp_user" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "message_delivery_settings"
      ADD COLUMN IF NOT EXISTS "smtp_password" varchar(512)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "message_delivery_settings" DROP COLUMN IF EXISTS "email_delivery_method"`);
    await queryRunner.query(`ALTER TABLE "message_delivery_settings" DROP COLUMN IF EXISTS "smtp_host"`);
    await queryRunner.query(`ALTER TABLE "message_delivery_settings" DROP COLUMN IF EXISTS "smtp_port"`);
    await queryRunner.query(`ALTER TABLE "message_delivery_settings" DROP COLUMN IF EXISTS "smtp_secure"`);
    await queryRunner.query(`ALTER TABLE "message_delivery_settings" DROP COLUMN IF EXISTS "smtp_user"`);
    await queryRunner.query(`ALTER TABLE "message_delivery_settings" DROP COLUMN IF EXISTS "smtp_password"`);
  }
}
