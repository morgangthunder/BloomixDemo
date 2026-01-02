import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateGeneratedImagesTable1735200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'generated_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'lesson_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'account_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'image_url',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '50',
            default: "'image/png'",
          },
          {
            name: 'width',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'height',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'prompt',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'substage_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'interaction_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'generated_images',
      new TableIndex({
        name: 'IDX_generated_images_lesson_id',
        columnNames: ['lesson_id'],
      }),
    );

    await queryRunner.createIndex(
      'generated_images',
      new TableIndex({
        name: 'IDX_generated_images_account_id',
        columnNames: ['account_id'],
      }),
    );

    await queryRunner.createIndex(
      'generated_images',
      new TableIndex({
        name: 'IDX_generated_images_lesson_account',
        columnNames: ['lesson_id', 'account_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('generated_images');
  }
}

