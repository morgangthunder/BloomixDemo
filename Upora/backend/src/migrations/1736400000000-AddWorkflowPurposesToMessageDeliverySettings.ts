import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowPurposesToMessageDeliverySettings1736400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add workflow_purposes column (JSON text) to message_delivery_settings
    const hasWP = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'message_delivery_settings' AND column_name = 'workflow_purposes'`,
    );
    if (hasWP.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "message_delivery_settings" ADD COLUMN "workflow_purposes" TEXT`,
      );
    }

    // Add email delivery status columns to notifications
    const hasEDS = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'email_delivery_status'`,
    );
    if (hasEDS.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "notifications" ADD COLUMN "email_delivery_status" VARCHAR(32)`,
      );
    }
    const hasER = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'email_requested'`,
    );
    if (hasER.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "notifications" ADD COLUMN "email_requested" BOOLEAN DEFAULT false`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message_delivery_settings" DROP COLUMN IF EXISTS "workflow_purposes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "email_delivery_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "email_requested"`,
    );
  }
}
