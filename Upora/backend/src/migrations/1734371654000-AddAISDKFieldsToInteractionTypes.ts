import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAISDKFieldsToInteractionTypes1734371654000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add ai_prompt_template column
    await queryRunner.addColumn(
      'interaction_types',
      new TableColumn({
        name: 'ai_prompt_template',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add ai_event_handlers column
    await queryRunner.addColumn(
      'interaction_types',
      new TableColumn({
        name: 'ai_event_handlers',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Add ai_response_actions column
    await queryRunner.addColumn(
      'interaction_types',
      new TableColumn({
        name: 'ai_response_actions',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('interaction_types', 'ai_response_actions');
    await queryRunner.dropColumn('interaction_types', 'ai_event_handlers');
    await queryRunner.dropColumn('interaction_types', 'ai_prompt_template');
  }
}


