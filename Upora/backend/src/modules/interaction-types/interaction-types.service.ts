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

  async seedTrueFalseSelection() {
    const exists = await this.interactionTypeRepository.findOne({
      where: { id: 'true-false-selection' },
    });

    if (!exists) {
      const trueFalseSelection = this.interactionTypeRepository.create({
        id: 'true-false-selection',
        name: 'True/False Selection',
        category: 'tease-trigger',
        description: 'Students must identify and select all the TRUE statements from a collection of fragments. Used to activate prior knowledge and surface misconceptions early in a lesson.',
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

TASK: Generate a True/False Selection interaction for the TEASE-Trigger phase.

PURPOSE: Activate prior knowledge, surface misconceptions, and hook students before diving into content.

1. IDENTIFY: 6-10 statements related to the content topic
   - Some statements are TRUE (based on content)
   - Some statements are FALSE (common misconceptions or incorrect variants)
   - Mix obvious and subtle differences
2. CREATE TARGET: Write a brief context/question that frames what to look for
3. WRITE EXPLANATIONS: For each statement, explain why it's true/false

EXAMPLE:
Content: "Photosynthesis converts light energy to chemical energy in plants"
Statements:
  - "Plants perform photosynthesis" (TRUE - core fact) ✓
  - "Chlorophyll captures sunlight" (TRUE - key molecule) ✓
  - "Plants eat soil" (FALSE - common misconception) ✗
  - "Photosynthesis occurs without light" (FALSE - light is required) ✗
  - "The process produces glucose and oxygen" (TRUE - outputs) ✓
  - "All living things photosynthesize" (FALSE - only plants and some bacteria) ✗

Target: "Which of these statements about photosynthesis are TRUE?"

CONFIDENCE SCORING:
- 0.9-1.0: Content has clear true/false statements with good misconceptions
- 0.7-0.9: Content allows statements but false options need creativity
- <0.7: Content too complex or unclear for true/false approach

OUTPUT FORMAT: Return ONLY valid JSON matching this structure:
{
  "confidence": 0.90,
  "output": {
    "fragments": [
      {"text": "Plants perform photosynthesis", "isTrueInContext": true, "explanation": "Plants are primary organisms that carry out photosynthesis"},
      {"text": "Plants eat soil", "isTrueInContext": false, "explanation": "Plants make their own food through photosynthesis, they don't consume soil"}
    ],
    "targetStatement": "Which of these statements about photosynthesis are TRUE?",
    "maxFragments": 8
  }
}`,
        pixiRenderer: 'TrueFalseSelectionComponent',
        minConfidence: 0.8,
        teachStageFit: ['tease-trigger'],
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

      await this.interactionTypeRepository.save(trueFalseSelection);
      console.log('[InteractionTypes] ✅ True/False Selection seeded successfully');
    } else {
      console.log('[InteractionTypes] ℹ️ True/False Selection already exists');
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

