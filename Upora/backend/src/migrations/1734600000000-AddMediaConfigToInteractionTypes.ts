import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMediaConfigToInteractionTypes1734600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'interaction_types',
      new TableColumn({
        name: 'media_config',
        type: 'jsonb',
        isNullable: true,
        comment: 'Media-specific configuration for uploaded-media interactions (autoplay, loop, muted, controls, preload)',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('interaction_types', 'media_config');
  }
}

