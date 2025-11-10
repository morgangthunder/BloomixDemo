import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionType } from '../../entities/interaction-type.entity';

@Injectable()
export class InteractionTypesService implements OnModuleInit {
  constructor(
    @InjectRepository(InteractionType)
    private interactionTypeRepository: Repository<InteractionType>,
  ) {}

  async onModuleInit() {
    // Seeding disabled - use POST /api/interaction-types/seed endpoint instead
    // This avoids race condition with TypeORM synchronize
  }

  async seedFragmentBuilder() {
    const exists = await this.interactionTypeRepository.findOne({
      where: { id: 'fragment-builder' },
    });

    if (!exists) {
      const fragmentBuilder = this.interactionTypeRepository.create({
        id: 'fragment-builder',
        name: 'True/False Fragment Builder',
        category: 'absorb-show',
        description: 'Fragments of statements arrive on screen. Student must build a true/correct sentence by tapping fragments. Can click fragments for explanations.',
        schema: {
          type: 'object',
          required: ['fragments', 'targetStatement'],
          properties: {
            fragments: {
              type: 'array',
              items: {
                type: 'object',
                required: ['text', 'isTrueInContext', 'explanation'],
                properties: {
                  text: { type: 'string' },
                  isTrueInContext: { type: 'boolean' },
                  explanation: { type: 'string' },
                },
              },
            },
            targetStatement: { type: 'string' },
            maxFragments: { type: 'number', default: 8 },
          },
        },
        generationPrompt: `FROM CONTENT: {contentText}

TASK: Generate a True/False Fragment Builder interaction.

1. IDENTIFY: Core concept or statement from the content
2. BREAK INTO FRAGMENTS: Split concept into 6-10 word/phrase fragments
   - Some fragments are TRUE in context (should be selected)
   - Some fragments are FALSE in context (should NOT be selected)
   - Mix correct and incorrect fragments
3. CREATE TARGET: Write the correct complete statement students should build
4. WRITE EXPLANATIONS: For each fragment, explain why it's true/false in context

EXAMPLE:
Content: "Photosynthesis converts light energy to chemical energy in plants"
Fragments:
  - "Plants" (TRUE - subject of photosynthesis) ✓
  - "convert light energy" (TRUE - core process) ✓
  - "eat soil" (FALSE - plants make food, don't eat soil) ✗
  - "to chemical energy" (TRUE - output of process) ✓
  - "at night" (FALSE - requires light) ✗
  - "using chlorophyll" (TRUE - key molecule) ✓

Target: "Plants convert light energy to chemical energy using chlorophyll"

CONFIDENCE SCORING:
- 0.9-1.0: Content has clear concept with good true/false options
- 0.7-0.9: Content allows fragments but needs creative false options
- <0.7: Content too complex or unclear for fragment approach

OUTPUT FORMAT: Return ONLY valid JSON matching this structure:
{
  "confidence": 0.85,
  "output": {
    "fragments": [
      {"text": "Plants", "isTrueInContext": true, "explanation": "Plants are the organisms that perform photosynthesis"},
      {"text": "eat soil", "isTrueInContext": false, "explanation": "Plants make their own food through photosynthesis, they don't eat soil"}
    ],
    "targetStatement": "Plants convert light energy to chemical energy using chlorophyll",
    "maxFragments": 8
  }
}`,
        pixiRenderer: 'FragmentBuilderComponent',
        minConfidence: 0.8,
        teachStageFit: ['absorb-show', 'tease-ignite'],
        cognitiveLoad: 'medium',
        estimatedDuration: 240, // 4 minutes
        assetRequirements: {
          uiElements: ['fragment-tile.png', 'checkmark.png', 'x-mark.png'],
          soundEffects: ['tap.mp3', 'correct.mp3', 'incorrect.mp3'],
          animations: ['shake-animation.json'],
        },
        mobileAdaptations: {
          tapToSelect: 'Large touch targets (min 48x48px)',
          shakeOnIncorrect: 'Haptic feedback for wrong selection',
          scrollableFragments: 'Horizontal scroll if >6 fragments on small screens',
        },
        scoringLogic:
          '(True fragments selected / Total true fragments) × 100. Incorrect selections do not penalize, just don\'t add to score. Clicking for explanations does not affect score.',
        isActive: true,
      });

      await this.interactionTypeRepository.save(fragmentBuilder);
      console.log('[InteractionTypes] ✅ Fragment Builder seeded successfully');
    } else {
      console.log('[InteractionTypes] ℹ️ Fragment Builder already exists');
    }
  }

  async findAll(): Promise<InteractionType[]> {
    return this.interactionTypeRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<InteractionType | null> {
    return this.interactionTypeRepository.findOne({ where: { id } });
  }

  async validateOutput(typeId: string, output: any): Promise<boolean> {
    const type = await this.findOne(typeId);
    if (!type) return false;

    // TODO: Implement Zod validation against type.schema
    // For now, just check basic structure
    return output && typeof output === 'object';
  }
}

