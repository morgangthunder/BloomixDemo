import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVideoUrlInteractionType1735100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO interaction_types (
        id, name, description, category, schema, generation_prompt,
        interaction_type_category, config_schema, sample_data,
        instance_data_schema, user_progress_schema, is_active
      ) VALUES (
        'video-url',
        'Video URL',
        'Embed and control external video URLs (YouTube, Vimeo, etc.) with full SDK support and playback controls.',
        'absorb-show',
        '{}',
        'Create a video URL interaction that embeds an external video (YouTube, Vimeo) with playback controls and SDK integration.',
        'video-url',
        '{
          "fields": [
            {
              "key": "autoplay",
              "type": "boolean",
              "label": "Autoplay",
              "default": false,
              "description": "Automatically start playback when the interaction loads (deprecated - use playVideoOnLoad)"
            },
            {
              "key": "playVideoOnLoad",
              "type": "boolean",
              "label": "Play video on load",
              "default": false,
              "description": "Automatically start video playback when the interaction loads"
            },
            {
              "key": "loop",
              "type": "boolean",
              "label": "Loop",
              "default": false,
              "description": "Loop the video when it reaches the end"
            },
            {
              "key": "defaultVolume",
              "type": "number",
              "label": "Default Volume",
              "default": 1.0,
              "min": 0.0,
              "max": 1.0,
              "step": 0.1,
              "description": "Initial volume level (0.0 to 1.0)"
            },
            {
              "key": "displayMode",
              "type": "select",
              "label": "Display Mode",
              "options": [
                {"value": "overlay", "label": "Overlay on Player"},
                {"value": "section", "label": "Section below Player"}
              ],
              "default": "section",
              "description": "How to display HTML/CSS/JS content relative to the video player"
            },
            {
              "key": "sectionHeight",
              "type": "string",
              "label": "Section Height",
              "default": "auto",
              "description": "Height of the section below player (e.g., 'auto', '300px', '50vh')"
            },
            {
              "key": "sectionMinHeight",
              "type": "string",
              "label": "Section Min Height",
              "default": "200px",
              "description": "Minimum height of the section below player"
            },
            {
              "key": "sectionMaxHeight",
              "type": "string",
              "label": "Section Max Height",
              "default": "none",
              "description": "Maximum height of the section below player (e.g., 'none', '500px', '80vh')"
            },
            {
              "key": "showCaptions",
              "type": "boolean",
              "label": "Show Captions",
              "default": false,
              "description": "Show closed captions/subtitles if available (YouTube/Vimeo)"
            },
            {
              "key": "videoQuality",
              "type": "select",
              "label": "Video Quality",
              "options": [
                {"value": "auto", "label": "Auto"},
                {"value": "hd1080", "label": "1080p"},
                {"value": "hd720", "label": "720p"},
                {"value": "medium", "label": "480p"},
                {"value": "small", "label": "360p"}
              ],
              "default": "auto",
              "description": "Preferred video quality (may be limited by provider)"
            }
          ]
        }',
        '{"message": "Select an approved video URL (YouTube or Vimeo) in the interaction configuration."}',
        '{"fields": [{"name": "playbackEvents", "type": "array", "required": false, "description": "Array of playback events (play, pause, seek, etc.)"}, {"name": "interactionPoints", "type": "array", "required": false, "description": "Array of interaction points with timestamps"}]}',
        '{"customFields": [{"name": "completionPercentage", "type": "number", "required": false, "description": "Percentage of video watched"}, {"name": "replayCount", "type": "number", "required": false, "description": "Number of times video was replayed"}]}',
        true
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        config_schema = EXCLUDED.config_schema,
        sample_data = EXCLUDED.sample_data,
        instance_data_schema = EXCLUDED.instance_data_schema,
        user_progress_schema = EXCLUDED.user_progress_schema;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM interaction_types WHERE id = 'video-url'`);
  }
}


