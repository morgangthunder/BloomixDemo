import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAISDKFieldsToInteractionTypes1734371654000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE interaction_types ADD COLUMN IF NOT EXISTS ai_prompt_template text`,
    );
    await queryRunner.query(
      `ALTER TABLE interaction_types ADD COLUMN IF NOT EXISTS ai_event_handlers jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE interaction_types ADD COLUMN IF NOT EXISTS ai_response_actions jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('interaction_types', 'ai_response_actions');
    await queryRunner.dropColumn('interaction_types', 'ai_event_handlers');
    await queryRunner.dropColumn('interaction_types', 'ai_prompt_template');
  }
}


