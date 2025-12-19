import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVideoUrlConfigToInteractionTypes1735100002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('interaction_types');
    const hasColumn = table?.findColumnByName('video_url_config');
    
    if (!hasColumn) {
      await queryRunner.addColumn(
        'interaction_types',
        new TableColumn({
          name: 'video_url_config',
          type: 'jsonb',
          isNullable: true,
        }),
      );
      console.log('✅ Added video_url_config column to interaction_types table');
    } else {
      console.log('ℹ️ video_url_config column already exists in interaction_types table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('interaction_types');
    const hasColumn = table?.findColumnByName('video_url_config');
    
    if (hasColumn) {
      await queryRunner.dropColumn('interaction_types', 'video_url_config');
      console.log('✅ Removed video_url_config column from interaction_types table');
    }
  }
}


