import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPrompt } from '../../entities/ai-prompt.entity';

@Injectable()
export class AiPromptsService {
  private readonly logger = new Logger(AiPromptsService.name);

  constructor(
    @InjectRepository(AiPrompt)
    private aiPromptRepository: Repository<AiPrompt>,
  ) {}

  /**
   * Get all prompts
   */
  async findAll(): Promise<AiPrompt[]> {
    return this.aiPromptRepository.find({
      where: { isActive: true },
      order: { assistantId: 'ASC', promptKey: 'ASC' },
    });
  }

  /**
   * Get prompts for a specific assistant
   */
  async findByAssistant(assistantId: string): Promise<AiPrompt[]> {
    return this.aiPromptRepository.find({
      where: { assistantId, isActive: true },
      order: { promptKey: 'ASC' },
    });
  }

  /**
   * Get a specific prompt
   */
  async findOne(id: string): Promise<AiPrompt | null> {
    return this.aiPromptRepository.findOne({ where: { id } });
  }

  /**
   * Get prompt by assistant and key
   */
  async findByKey(assistantId: string, promptKey: string): Promise<AiPrompt | null> {
    return this.aiPromptRepository.findOne({
      where: { assistantId, promptKey, isActive: true },
    });
  }

  /**
   * Create or update a prompt
   */
  async upsert(
    assistantId: string,
    promptKey: string,
    label: string,
    content: string,
    defaultContent?: string,
  ): Promise<AiPrompt> {
    const id = `${assistantId}.${promptKey}`;
    const existing = await this.findOne(id);

    if (existing) {
      existing.content = content;
      existing.label = label;
      if (defaultContent) {
        existing.defaultContent = defaultContent;
      }
      return this.aiPromptRepository.save(existing);
    } else {
      const prompt = this.aiPromptRepository.create({
        id,
        assistantId,
        promptKey,
        label,
        content,
        defaultContent: defaultContent || content,
        isActive: true,
      });
      return this.aiPromptRepository.save(prompt);
    }
  }

  /**
   * Update prompt content
   */
  async updateContent(id: string, content: string): Promise<AiPrompt> {
    const prompt = await this.findOne(id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }

    prompt.content = content;
    return this.aiPromptRepository.save(prompt);
  }

  /**
   * Reset prompt to default
   */
  async resetToDefault(id: string): Promise<AiPrompt> {
    const prompt = await this.findOne(id);
    if (!prompt) {
      throw new Error(`Prompt not found: ${id}`);
    }

    prompt.content = prompt.defaultContent || prompt.content;
    return this.aiPromptRepository.save(prompt);
  }

  /**
   * Seed all default prompts
   */
  async seedDefaultPrompts(): Promise<void> {
    this.logger.log('[AiPrompts] 🌱 Seeding default prompts...');

    const prompts = [
      // Auto-Populator
      {
        assistantId: 'auto-populator',
        promptKey: 'textAutoPopulate',
        label: 'Text Content Auto-Populate Prompt',
        content: `You are helping a user create educational content from raw text. Analyze the text and generate a concise title, summary, and relevant topics.

Given the text content, generate:
1. **Title**: A clear, descriptive title (max 100 characters)
2. **Summary**: A 2-3 sentence summary of the main points
3. **Topics**: Maximum 4 relevant topic tags

Guidelines:
- Title should be informative and engaging
- Summary should capture the essence without jargon
- Topics should be general categories (e.g., "Science", "Biology", "Cells") not overly specific
- Maximum 4 topics

Return ONLY valid JSON:
{
  "title": "string",
  "summary": "string",
  "topics": ["topic1", "topic2", "topic3", "topic4"]
}`,
      },
      {
        assistantId: 'auto-populator',
        promptKey: 'pdfAutoPopulate',
        label: 'PDF Auto-Populate Prompt',
        content: `You are helping a user catalog a PDF document. Analyze the extracted text and generate metadata.

Given the PDF content, generate:
1. **Title**: Document title based on content (max 100 characters)
2. **Summary**: Brief overview of the document's purpose
3. **Topics**: Maximum 4 subject categories

Consider:
- Academic papers: Extract actual title if present
- Textbooks: Use chapter/section name
- Reports: Summarize main findings

Return ONLY valid JSON:
{
  "title": "string",
  "summary": "string",
  "topics": ["topic1", "topic2", "topic3", "topic4"]
}`,
      },
      // Content Analyzer (from existing service)
      {
        assistantId: 'content-analyzer',
        promptKey: 'trueFalseSelection',
        label: 'True/False Selection Generation',
        content: `FROM CONTENT: {contentText}

TASK: Generate a True/False Selection interaction for the TEASE-Trigger phase.

PURPOSE: Activate prior knowledge, surface misconceptions, and hook students before diving into content.

1. IDENTIFY: 6-10 statements related to the content topic
   - Some statements are TRUE (based on content)
   - Some statements are FALSE (common misconceptions or incorrect variants)
   - Mix obvious and subtle differences
2. CREATE TARGET: Write a brief context/question that frames what to look for
3. WRITE EXPLANATIONS: For each statement, explain why it's true/false

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
      },
    ];

    for (const promptData of prompts) {
      await this.upsert(
        promptData.assistantId,
        promptData.promptKey,
        promptData.label,
        promptData.content,
        promptData.content, // Use same content as default
      );
    }

    this.logger.log(`[AiPrompts] ✅ Seeded ${prompts.length} default prompts`);
  }
}

