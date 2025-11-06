import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddYouTubeFieldsToProcessedContent1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add YouTube-specific fields to processed_content_outputs table
    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'video_id',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'title',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'thumbnail',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'channel',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'duration',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'transcript',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'start_time',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'end_time',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'validation_score',
        type: 'decimal',
        precision: 3,
        scale: 2,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'processed_content_outputs',
      new TableColumn({
        name: 'created_by',
        type: 'uuid',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('processed_content_outputs', 'created_by');
    await queryRunner.dropColumn('processed_content_outputs', 'validation_score');
    await queryRunner.dropColumn('processed_content_outputs', 'end_time');
    await queryRunner.dropColumn('processed_content_outputs', 'start_time');
    await queryRunner.dropColumn('processed_content_outputs', 'transcript');
    await queryRunner.dropColumn('processed_content_outputs', 'duration');
    await queryRunner.dropColumn('processed_content_outputs', 'channel');
    await queryRunner.dropColumn('processed_content_outputs', 'thumbnail');
    await queryRunner.dropColumn('processed_content_outputs', 'description');
    await queryRunner.dropColumn('processed_content_outputs', 'title');
    await queryRunner.dropColumn('processed_content_outputs', 'video_id');
  }
}



