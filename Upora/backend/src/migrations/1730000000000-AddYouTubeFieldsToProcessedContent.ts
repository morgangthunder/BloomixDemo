import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYouTubeFieldsToProcessedContent1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add YouTube-specific fields (idempotent: skip if column exists)
    const columns: Array<{ name: string; def: string }> = [
      { name: 'video_id', def: 'varchar(50)' },
      { name: 'title', def: 'text' },
      { name: 'description', def: 'text' },
      { name: 'thumbnail', def: 'varchar(500)' },
      { name: 'channel', def: 'varchar(100)' },
      { name: 'duration', def: 'varchar(50)' },
      { name: 'transcript', def: 'text' },
      { name: 'start_time', def: 'int' },
      { name: 'end_time', def: 'int' },
      { name: 'validation_score', def: 'decimal(3,2)' },
      { name: 'created_by', def: 'uuid' },
    ];
    for (const col of columns) {
      await queryRunner.query(
        `ALTER TABLE processed_content_outputs ADD COLUMN IF NOT EXISTS "${col.name}" ${col.def}`,
      );
    }
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



