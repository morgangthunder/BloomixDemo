import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  SDK_TEST_IFRAME_HTML,
  SDK_TEST_IFRAME_CSS,
  SDK_TEST_IFRAME_JS,
  SDK_TEST_IFRAME_CONFIG,
} from '../modules/interaction-types/sdk-test-iframe-overlay';

/**
 * Add overlay HTML/CSS/JS code to sdk-test-iframe interaction.
 * This includes Save User Progress and Mark Completed buttons for scoring.
 * Ensures sdk-test-iframe can manage scoring correctly (audit fix).
 */
export class AddOverlayCodeToSDKTestIframe1735600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const iframeConfig = JSON.stringify(SDK_TEST_IFRAME_CONFIG);

    await queryRunner.query(
      `UPDATE interaction_types
       SET html_code = $1, css_code = $2, js_code = $3, iframe_config = $4::jsonb,
           description = $5
       WHERE id = 'sdk-test-iframe'`,
      [
        SDK_TEST_IFRAME_HTML,
        SDK_TEST_IFRAME_CSS,
        SDK_TEST_IFRAME_JS,
        iframeConfig,
        'Comprehensive test interaction for all AI Teacher SDK functionality using an iframe with overlay mode. Includes Save User Progress and Mark Completed for scoring. Set overlayMode in iframeConfig.',
      ],
    );

    console.log('[Migration] ✅ Added overlay code (with score saving) to sdk-test-iframe');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE interaction_types
       SET html_code = NULL, css_code = NULL, js_code = NULL
       WHERE id = 'sdk-test-iframe'`,
    );
  }
}
