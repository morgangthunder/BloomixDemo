import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDataStorageSchemasToInteractionTypes1734500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add instance_data_schema column
    await queryRunner.addColumn(
      'interaction_types',
      new TableColumn({
        name: 'instance_data_schema',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Add user_progress_schema column
    await queryRunner.addColumn(
      'interaction_types',
      new TableColumn({
        name: 'user_progress_schema',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('interaction_types', 'user_progress_schema');
    await queryRunner.dropColumn('interaction_types', 'instance_data_schema');
  }
}

