import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add n8n_api_key to message_delivery_settings for N8N API access from Super Admin.
 */
export class AddN8nApiKeyToMessageDeliverySettings1736300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "message_delivery_settings"
      ADD COLUMN IF NOT EXISTS "n8n_api_key" varchar(512)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "message_delivery_settings" DROP COLUMN IF EXISTS "n8n_api_key"`);
  }
}
