import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateInteractionTypes1731105000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'interaction_types',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'schema',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'generation_prompt',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'pixi_renderer',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'min_confidence',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0.7,
          },
          {
            name: 'teach_stage_fit',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'requires_resources',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cognitive_load',
            type: 'varchar',
            default: "'medium'",
          },
          {
            name: 'estimated_duration',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'asset_requirements',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'mobile_adaptations',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'scoring_logic',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    // Seed with Fragment Builder interaction type
    await queryRunner.query(`
      INSERT INTO interaction_types (
        id, name, category, description, schema, generation_prompt,
        pixi_renderer, min_confidence, teach_stage_fit, cognitive_load,
        estimated_duration, asset_requirements, mobile_adaptations, scoring_logic
      ) VALUES (
        'fragment-builder',
        'True/False Fragment Builder',
        'absorb-show',
        'Fragments of statements arrive on screen. Student must build a true/correct sentence by tapping fragments. Can click fragments for explanations.',
        '${JSON.stringify({
          type: 'object',
          required: ['fragments', 'targetStatement'],
          properties: {
            fragments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  isTrueInContext: { type: 'boolean' },
                  explanation: { type: 'string' }
                }
              }
            },
            targetStatement: { type: 'string' },
            maxFragments: { type: 'number', default: 8 }
          }
        })}'::jsonb,
        'FROM CONTENT: {contentText}

TASK: Generate a True/False Fragment Builder interaction.

1. IDENTIFY: Core concept or statement from the content
2. BREAK INTO FRAGMENTS: Split concept into 6-10 word/phrase fragments
   - Some fragments are TRUE in context (should be selected)
   - Some fragments are FALSE in context (should NOT be selected)
   - Mix correct and incorrect fragments
3. CREATE TARGET: Write the correct complete statement students should build
4. WRITE EXPLANATIONS: For each fragment, explain why it''s true/false in context

EXAMPLE:
Content: "Photosynthesis converts light energy to chemical energy in plants"
Fragments:
  - "Plants" (TRUE - subject of photosynthesis) ✓
  - "convert light energy" (TRUE - core process) ✓
  - "eat soil" (FALSE - plants make food, don''t eat soil) ✗
  - "to chemical energy" (TRUE - output of process) ✓
  - "at night" (FALSE - requires light) ✗
  - "using chlorophyll" (TRUE - key molecule) ✓

Target: "Plants convert light energy to chemical energy using chlorophyll"

CONFIDENCE SCORING:
- 0.9-1.0: Content has clear concept with good true/false options
- 0.7-0.9: Content allows fragments but needs creative false options
- <0.7: Content too complex or unclear for fragment approach

OUTPUT FORMAT: {JSON matching schema}',
        'FragmentBuilderComponent',
        0.8,
        'absorb-show,tease-ignite',
        'medium',
        240,
        '${JSON.stringify({
          uiElements: ['fragment-tile.png', 'checkmark.png', 'x-mark.png'],
          soundEffects: ['tap.mp3', 'correct.mp3', 'incorrect.mp3'],
          animations: ['shake-animation.json']
        })}'::jsonb,
        '${JSON.stringify({
          tapToSelect: 'Large touch targets (min 48x48px)',
          shakeOnIncorrect: 'Haptic feedback for wrong selection',
          scrollableFragments: 'Horizontal scroll if >6 fragments on small screens'
        })}'::jsonb,
        '(True fragments selected / Total true fragments) × 100. Incorrect selections do not penalize, just don''t add to score. Clicking for explanations does not affect score.'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('interaction_types');
  }
}

