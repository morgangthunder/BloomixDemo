import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { InteractionType } from '../entities/interaction-type.entity';
import { ContentSource } from '../entities/content-source.entity';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { LlmProvider } from '../entities/llm-provider.entity';
import { AiPrompt } from '../entities/ai-prompt.entity';

interface AnalysisResult {
  interactionTypeId: string;
  confidence: number;
  output: any;
  tokensUsed: number;
  providerId: string;
}

@Injectable()
export class ContentAnalyzerService {
  private readonly logger = new Logger(ContentAnalyzerService.name);

  constructor(
    @InjectRepository(InteractionType)
    private interactionTypeRepository: Repository<InteractionType>,
    @InjectRepository(ContentSource)
    private contentSourceRepository: Repository<ContentSource>,
    @InjectRepository(ProcessedContentOutput)
    private processedContentRepository: Repository<ProcessedContentOutput>,
    @InjectRepository(LlmGenerationLog)
    private llmLogRepository: Repository<LlmGenerationLog>,
    @InjectRepository(LlmProvider)
    private llmProviderRepository: Repository<LlmProvider>,
    @InjectRepository(AiPrompt)
    private aiPromptRepository: Repository<AiPrompt>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Analyze a content source and generate interaction outputs
   * Currently only generates for Fragment Builder (MVP)
   * Future: Generate for all applicable interaction types
   */
  async analyzeContentSource(
    contentSourceId: string,
    userId: string,
  ): Promise<AnalysisResult[]> {
    this.logger.log(`[ContentAnalyzer] 🔍 Analyzing content source: ${contentSourceId}`);

    // 1. Fetch content source
    const contentSource = await this.contentSourceRepository.findOne({
      where: { id: contentSourceId },
    });

    if (!contentSource) {
      throw new Error('Content source not found');
    }

    // 2. Extract text content
    const contentText = this.extractTextFromSource(contentSource);
    if (!contentText || contentText.length < 50) {
      this.logger.warn('[ContentAnalyzer] ⚠️ Content too short for analysis');
      return [];
    }

    // 3. Get Fragment Builder interaction type
    const fragmentBuilder = await this.interactionTypeRepository.findOne({
      where: { id: 'true-false-selection', isActive: true },
    });

    if (!fragmentBuilder) {
      this.logger.error('[ContentAnalyzer] ❌ Fragment Builder interaction type not found');
      return [];
    }

    // 4. Get active LLM provider
    const provider = await this.llmProviderRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (!provider) {
      this.logger.error('[ContentAnalyzer] ❌ No active LLM provider configured');
      throw new Error('No active LLM provider configured. Please configure a provider in Super Admin.');
    }

    // 5. Get prompt from database (or use interaction type's default)
    const dbPrompt = await this.aiPromptRepository.findOne({
      where: { 
        assistantId: 'content-analyzer', 
        promptKey: 'trueFalseSelection', 
        isActive: true 
      },
    });
    const promptToUse = dbPrompt?.content || fragmentBuilder.generationPrompt;
    
    if (dbPrompt) {
      this.logger.log('[ContentAnalyzer] 📝 Using prompt from database');
    } else {
      this.logger.log('[ContentAnalyzer] ⚠️ No DB prompt found, using interaction type default');
    }

    // 6. Generate True/False Selection output using active provider
    this.logger.log(`[ContentAnalyzer] 🤖 Calling ${provider.name} for True/False Selection generation...`);
    const startTime = Date.now();
    const result = await this.generateFragmentBuilder(
      contentText,
      promptToUse,
      provider,
    );
    const processingTime = Date.now() - startTime;

    if (!result) {
      return [];
    }

    // 6. Log token usage to database
    await this.logTokenUsage({
      contentSourceId,
      userId,
      tenantId: contentSource.tenantId,
      providerId: provider.id,
      useCase: 'content-analysis',
      promptText: fragmentBuilder.generationPrompt.substring(0, 500) + '...', // Truncate for storage
      response: result,
      tokensUsed: result.tokensUsed,
      processingTimeMs: processingTime,
      outputsGenerated: result.confidence >= fragmentBuilder.minConfidence ? 1 : 0,
    });

    // 6. Validate and save if confidence >= threshold
    if (result.confidence >= fragmentBuilder.minConfidence) {
      await this.saveProcessedOutput({
        contentSourceId,
        interactionTypeId: 'true-false-selection',
        output: result.output,
        confidence: result.confidence,
        tokensUsed: result.tokensUsed,
        userId,
        tenantId: contentSource.tenantId,
      });

      this.logger.log(
        `[ContentAnalyzer] ✅ Fragment Builder output generated (confidence: ${result.confidence})`,
      );
      return [result];
    } else {
      this.logger.warn(
        `[ContentAnalyzer] ⚠️ Confidence ${result.confidence} below threshold ${fragmentBuilder.minConfidence}`,
      );
      return [];
    }
  }

  /**
   * Generate Fragment Builder interaction using active LLM provider
   */
  private async generateFragmentBuilder(
    contentText: string,
    promptTemplate: string,
    provider: LlmProvider,
  ): Promise<AnalysisResult | null> {
    try {
      // Replace {contentText} in prompt template
      const prompt = promptTemplate.replace('{contentText}', contentText);

      // Call LLM API using active provider settings
      this.logger.log(`[ContentAnalyzer] Using provider: ${provider.name} (${provider.modelName})`);
      
      const response = (await firstValueFrom(
        this.httpService.post(
          provider.apiEndpoint,
          {
            model: provider.modelName,
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert educational content creator. Generate high-quality interaction data in valid JSON format only.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: parseFloat(provider.temperature as any), // Convert string to number
            max_tokens: Math.min(provider.maxTokens, 1000), // Cap at 1000 for Fragment Builder
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${provider.apiKey}`,
            },
          },
        ),
      )) as AxiosResponse<any>;

      const grokResponse = response.data as any;
      const tokensUsed = grokResponse.usage?.total_tokens || 0;
      const messageContent = grokResponse.choices?.[0]?.message?.content;

      if (!messageContent) {
        this.logger.error('[ContentAnalyzer] ❌ No content in Grok response');
        return null;
      }

      // Parse JSON from response (Grok may wrap it in markdown code blocks)
      const jsonMatch = messageContent.match(/```json\n([\s\S]*?)\n```/) ||
        messageContent.match(/```\n([\s\S]*?)\n```/) ||
        [null, messageContent];
      
      const jsonStr = jsonMatch[1] || messageContent;
      const parsed = JSON.parse(jsonStr.trim());

      this.logger.log(`[ContentAnalyzer] 📊 ${provider.name} tokens used: ${tokensUsed}`);

      // Log token usage for dashboard (Note: userId and tenantId passed from calling method)
      // This is logged separately in analyzeContentSource method

      return {
        interactionTypeId: 'true-false-selection',
        confidence: parsed.confidence || 0,
        output: parsed.output || parsed,
        tokensUsed,
        providerId: provider.id,
      };
    } catch (error) {
      this.logger.error(`[ContentAnalyzer] ❌ ${provider.name} API error:`, error.message);
      if (error.response?.data) {
        this.logger.error('[ContentAnalyzer] Response:', JSON.stringify(error.response.data));
      }
      return null;
    }
  }

  /**
   * Extract text content from various source types
   */
  private extractTextFromSource(source: ContentSource): string {
    if (source.fullText) {
      return source.fullText;
    }

    if (source.summary) {
      return source.summary;
    }

    // For URLs, we'd need to fetch and parse (future enhancement)
    // For now, use summary or return empty
    return '';
  }

  /**
   * Log token usage to database for dashboard
   */
  private async logTokenUsage(data: {
    contentSourceId: string;
    userId: string;
    tenantId: string;
    providerId: string;
    useCase: string;
    promptText: string;
    response: any;
    tokensUsed: number;
    processingTimeMs: number;
    outputsGenerated: number;
  }) {
    const log = this.llmLogRepository.create({
      contentSourceId: data.contentSourceId,
      userId: data.userId,
      tenantId: data.tenantId,
      providerId: data.providerId,
      useCase: data.useCase,
      promptText: data.promptText,
      response: data.response,
      tokensUsed: data.tokensUsed,
      processingTimeMs: data.processingTimeMs,
      outputsGenerated: data.outputsGenerated,
      outputsApproved: 0, // Updated later when builder approves
    });

    await this.llmLogRepository.save(log);
    this.logger.log(`[ContentAnalyzer] 📊 Token usage logged: ${data.tokensUsed} tokens`);
  }

  /**
   * Save processed output to database
   */
  private async saveProcessedOutput(data: {
    contentSourceId: string;
    interactionTypeId: string;
    output: any;
    confidence: number;
    tokensUsed: number;
    userId: string;
    tenantId: string;
  }) {
    const processedOutput = this.processedContentRepository.create({
      lessonId: '00000000-0000-0000-0000-000000000000', // Placeholder - not linked to lesson yet
      contentSourceId: data.contentSourceId,
      outputType: data.interactionTypeId,
      outputName: data.output.targetStatement || 'Fragment Builder Output',
      outputData: {
        ...data.output,
        _metadata: {
          confidence: data.confidence,
          tokensUsed: data.tokensUsed,
          generatedBy: 'llm-auto',
          generatedAt: new Date().toISOString(),
        },
      },
      notes: `Auto-generated by LLM with confidence: ${data.confidence.toFixed(2)}`,
      createdBy: data.userId,
    });

    await this.processedContentRepository.save(processedOutput);
    this.logger.log(`[ContentAnalyzer] 💾 Saved processed output (outputType: ${data.interactionTypeId})`);
  }
}

