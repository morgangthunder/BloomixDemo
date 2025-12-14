import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSDKTestIframeSampleData1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update sample_data to remove confusing message and use a simple URL
    await queryRunner.query(`
      UPDATE interaction_types
      SET sample_data = '{"url": "https://en.wikipedia.org/wiki/Main_Page"}'
      WHERE id = 'sdk-test-iframe' AND sample_data::text LIKE '%For iframe interactions%';
    `);
    
    // Also update iframe-embed if it exists
    await queryRunner.query(`
      UPDATE interaction_types
      SET sample_data = '{"url": "https://en.wikipedia.org/wiki/Main_Page"}'
      WHERE id = 'iframe-embed' AND sample_data::text LIKE '%For iframe interactions%';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to original message (optional - not critical)
    await queryRunner.query(`
      UPDATE interaction_types
      SET sample_data = '{"url": "", "message": "For iframe interactions, set the iframeUrl field to point to the HTML document. The full HTML document is in Upora/backend/scripts/sdk-test-iframe-document.html"}'
      WHERE id = 'sdk-test-iframe';
    `);
  }
}

