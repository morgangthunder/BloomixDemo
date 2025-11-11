import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { LlmProvider } from '../entities/llm-provider.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { AiPrompt } from '../entities/ai-prompt.entity';

export interface AutoPopulateResult {
  title: string;
  summary: string;
  topics: string[];
}

@Injectable()
export class AutoPopulatorService {
  private readonly logger = new Logger(AutoPopulatorService.name);

  // Default prompt for text content auto-population
  private readonly DEFAULT_TEXT_PROMPT = `You are helping a user create educational content from raw text. Analyze the text and generate a concise title, summary, and relevant topics.

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
}`;

  constructor(
    @InjectRepository(LlmProvider)
    private llmProviderRepository: Repository<LlmProvider>,
    @InjectRepository(LlmGenerationLog)
    private llmLogRepository: Repository<LlmGenerationLog>,
    @InjectRepository(AiPrompt)
    private aiPromptRepository: Repository<AiPrompt>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Auto-populate fields for text content
   */
  async autoPopulateText(
    textContent: string,
    userId: string,
    tenantId: string,
    customPrompt?: string,
  ): Promise<AutoPopulateResult> {
    this.logger.log('[AutoPopulator] 🎨 Auto-populating fields for text content...');

    // Get active LLM provider
    const provider = await this.llmProviderRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (!provider) {
      throw new Error('No active LLM provider found');
    }

    const startTime = Date.now();
    
    // Fetch prompt from database if not provided
    let promptToUse = customPrompt;
    if (!promptToUse) {
      const dbPrompt = await this.aiPromptRepository.findOne({
        where: { assistantId: 'auto-populator', promptKey: 'textAutoPopulate', isActive: true },
      });
      promptToUse = dbPrompt?.content || this.DEFAULT_TEXT_PROMPT;
      
      if (dbPrompt) {
        this.logger.log('[AutoPopulator] 📝 Using prompt from database');
      } else {
        this.logger.log('[AutoPopulator] ⚠️ No DB prompt found, using default');
      }
    }

    try {
      // Call LLM API
      const result = await this.callLLM(provider, textContent, promptToUse);

      const processingTime = Date.now() - startTime;

      // Log token usage
      await this.logTokenUsage(
        userId,
        tenantId,
        provider.id,
        'auto-populate-text',
        promptToUse,
        result.tokensUsed,
        processingTime,
        result.response,
      );

      this.logger.log(`[AutoPopulator] ✅ Auto-populated: "${result.data.title}"`);
      this.logger.log(`[AutoPopulator] 📊 Tokens used: ${result.tokensUsed}, Time: ${processingTime}ms`);

      return result.data;
    } catch (error) {
      this.logger.error('[AutoPopulator] ❌ Error:', error.message);
      throw error;
    }
  }

  /**
   * Get the default text auto-populate prompt (for display in UI)
   */
  getDefaultTextPrompt(): string {
    return this.DEFAULT_TEXT_PROMPT;
  }

  /**
   * Call LLM API for auto-population
   */
  private async callLLM(
    provider: LlmProvider,
    textContent: string,
    promptTemplate: string,
  ): Promise<{ data: AutoPopulateResult; tokensUsed: number; response: any }> {
    // Truncate text if too long (keep first 10,000 chars for metadata generation)
    const truncatedText = textContent.length > 10000 
      ? textContent.substring(0, 10000) + '...' 
      : textContent;

    const prompt = `${promptTemplate}\n\nText Content:\n${truncatedText}`;

    const response = await firstValueFrom(
      this.httpService.post(
        provider.apiEndpoint,
        {
          model: provider.modelName,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational content curator. Generate metadata in valid JSON format only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: parseFloat(provider.temperature as any),
          max_tokens: 500, // Small response for metadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
          },
        },
      ),
    );

    const llmResponse = response.data as any;
    const tokensUsed = llmResponse.usage?.total_tokens || 0;
    const messageContent = llmResponse.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error('No content in LLM response');
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = messageContent.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : messageContent;
    const parsed = JSON.parse(jsonStr.trim());

    return {
      data: {
        title: parsed.title || 'Untitled Content',
        summary: parsed.summary || '',
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      },
      tokensUsed,
      response: llmResponse,
    };
  }

  /**
   * Log token usage
   */
  private async logTokenUsage(
    userId: string,
    tenantId: string,
    providerId: string,
    useCase: string,
    promptText: string,
    tokensUsed: number,
    processingTimeMs: number,
    response: any,
  ): Promise<void> {
    try {
      await this.llmLogRepository.save({
        userId,
        tenantId,
        providerId,
        useCase,
        promptText: promptText.substring(0, 1000), // Truncate for storage
        tokensUsed,
        processingTimeMs,
        response,
        outputsGenerated: 1,
        outputsApproved: 0,
        contentSourceId: null,
      });
    } catch (error) {
      this.logger.error('[AutoPopulator] Failed to log token usage:', error.message);
    }
  }
}

