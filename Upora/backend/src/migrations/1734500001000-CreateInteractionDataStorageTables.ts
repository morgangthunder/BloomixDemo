import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateInteractionDataStorageTables1734500001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create interaction_instance_data table
    await queryRunner.createTable(
      new Table({
        name: 'interaction_instance_data',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'lesson_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'stage_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'substage_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'interaction_type_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'processed_content_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'instance_data',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for interaction_instance_data
    await queryRunner.createIndex(
      'interaction_instance_data',
      new TableIndex({
        name: 'idx_instance_data_interaction',
        columnNames: ['interaction_type_id', 'lesson_id', 'substage_id'],
      }),
    );

    await queryRunner.createIndex(
      'interaction_instance_data',
      new TableIndex({
        name: 'idx_instance_data_created',
        columnNames: ['created_at'],
      }),
    );

    // Create user_interaction_progress table
    await queryRunner.createTable(
      new Table({
        name: 'user_interaction_progress',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'lesson_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'stage_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'substage_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'interaction_type_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'start_timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'complete_timestamp',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'attempts',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
          {
            name: 'completed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'score',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'time_taken_seconds',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'interaction_events',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'custom_data',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key for user_interaction_progress
    await queryRunner.createForeignKey(
      'user_interaction_progress',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create unique constraint for user_interaction_progress
    await queryRunner.createIndex(
      'user_interaction_progress',
      new TableIndex({
        name: 'idx_user_progress_unique',
        columnNames: ['user_id', 'lesson_id', 'stage_id', 'substage_id', 'interaction_type_id'],
        isUnique: true,
      }),
    );

    // Create indexes for user_interaction_progress
    await queryRunner.createIndex(
      'user_interaction_progress',
      new TableIndex({
        name: 'idx_user_progress_user',
        columnNames: ['user_id', 'lesson_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_interaction_progress',
      new TableIndex({
        name: 'idx_user_progress_interaction',
        columnNames: ['interaction_type_id', 'lesson_id', 'substage_id'],
      }),
    );

    // Create user_public_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'user_public_profiles',
        columns: [
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'preferences',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'public_avatar_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'share_name',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'share_preferences',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key for user_public_profiles
    await queryRunner.createForeignKey(
      'user_public_profiles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('user_public_profiles', 'FK_user_public_profiles_user_id');
    await queryRunner.dropForeignKey('user_interaction_progress', 'FK_user_interaction_progress_user_id');

    // Drop tables
    await queryRunner.dropTable('user_public_profiles');
    await queryRunner.dropTable('user_interaction_progress');
    await queryRunner.dropTable('interaction_instance_data');
  }
}

