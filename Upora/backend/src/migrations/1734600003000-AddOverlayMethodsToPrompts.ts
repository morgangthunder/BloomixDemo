import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOverlayMethodsToPrompts1734600003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update SDK Content prompt (used by AI Teacher for all interactions)
    await queryRunner.query(`
      UPDATE ai_prompts
      SET content = content || E'\\n\\n### Overlay Control Methods (Media Player only):\\n- \`aiSDK.showOverlayHtml()\` - Show the overlay HTML content (if hidden)\\n- \`aiSDK.hideOverlayHtml()\` - Hide the overlay HTML content\\n\\nThese methods allow you to programmatically show or hide the overlay content during media playback. The overlay can be hidden during playback (via config) and then shown again when needed (e.g., to show a quiz or question).'
      WHERE assistant_id = 'ai-interaction-handler' AND prompt_key = 'sdk-content'
      AND content NOT LIKE '%showOverlayHtml%';
    `);

    // Update Media Player interaction prompt for Inventor
    await queryRunner.query(`
      UPDATE ai_prompts
      SET content = content || E'\\n\\n### Overlay Control Methods (Media Player only):\\n- \`aiSDK.showOverlayHtml()\` - Show the overlay HTML content (if hidden)\\n- \`aiSDK.hideOverlayHtml()\` - Hide the overlay HTML content\\n\\nThese methods allow you to programmatically show or hide the overlay content during media playback. The overlay can be hidden during playback (via config) and then shown again when needed (e.g., to show a quiz or question).\\n\\n### Example: Show/Hide Overlay:\\n\`\`\`javascript\\n// Hide overlay when media starts playing\\naiSDK.onResponse((response) => {\\n  if (response.action === ''start-media'') {\\n    aiSDK.hideOverlayHtml();\\n  }\\n});\\n\\n// Show overlay when question appears\\naiSDK.onResponse((response) => {\\n  if (response.action === ''show-question'') {\\n    aiSDK.showOverlayHtml();\\n  }\\n});\\n\`\`\`'
      WHERE assistant_id = 'inventor' AND prompt_key = 'media-player-interaction'
      AND content NOT LIKE '%showOverlayHtml%';
    `);

    // Update General interaction prompt to mention overlay methods
    await queryRunner.query(`
      UPDATE ai_prompts
      SET content = content || E'\\n\\n### Overlay Control Methods:\\n- \`aiSDK.showOverlayHtml()\` - Show overlay HTML content\\n- \`aiSDK.hideOverlayHtml()\` - Hide overlay HTML content\\n\\nThese methods allow programmatic control of overlay visibility during media playback.'
      WHERE assistant_id = 'inventor' AND prompt_key = 'general'
      AND content NOT LIKE '%showOverlayHtml%';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: Reverting prompt updates is complex, so we'll leave the content as-is
    // The overlay methods are additive and don't break existing functionality
  }
}


