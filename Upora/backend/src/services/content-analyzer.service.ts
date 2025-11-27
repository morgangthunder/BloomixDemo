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
   * Prevents duplicates: if a processed output already exists for this content source and output type,
   * it updates the existing one instead of creating a new one
   */
  private async saveProcessedOutput(data: {
    contentSourceId: string;
    interactionTypeId: string;
    output: any;
    confidence: number;
    tokensUsed: number;
    userId: string;
    tenantId: string;
    outputName?: string; // Optional custom name
  }) {
    // Check if processed output already exists for this content source and output type
    const existingOutput = await this.processedContentRepository.findOne({
      where: {
        contentSourceId: data.contentSourceId,
        outputType: data.interactionTypeId,
      },
    });

    // Get content source to use its title
    const contentSource = await this.contentSourceRepository.findOne({
      where: { id: data.contentSourceId },
    });
    
    // Generate output name: use custom name if provided, otherwise use content source title + suffix
    let outputName = data.outputName;
    if (!outputName) {
      const sourceTitle = contentSource?.title || contentSource?.sourceUrl || 'Content';
      outputName = `${sourceTitle} - processed for interactions`;
    }

    if (existingOutput) {
      // Update existing output instead of creating duplicate
      existingOutput.outputName = outputName;
      existingOutput.outputData = {
        ...data.output,
        _metadata: {
          confidence: data.confidence,
          tokensUsed: data.tokensUsed,
          generatedBy: 'llm-auto',
          generatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      existingOutput.notes = `Auto-generated by LLM with confidence: ${data.confidence.toFixed(2)} (updated)`;
      existingOutput.createdBy = data.userId;
      
      await this.processedContentRepository.save(existingOutput);
      this.logger.log(`[ContentAnalyzer] 🔄 Updated existing processed output (outputType: ${data.interactionTypeId})`);
    } else {
      // Create new output
      const processedOutput = this.processedContentRepository.create({
        lessonId: '00000000-0000-0000-0000-000000000000', // Placeholder - not linked to lesson yet
        contentSourceId: data.contentSourceId,
        outputType: data.interactionTypeId,
        outputName: outputName,
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

  /**
   * Process iframe guide URL and create processed content output
   * Uses the 'iFrame Guide URL Analysis Prompt' from content-analyzer assistant
   */
  async processIframeGuideUrl(
    contentSourceId: string,
    userId: string,
  ): Promise<any> {
    this.logger.log(`[ContentAnalyzer] 🌐 Processing iframe guide URL: ${contentSourceId}`);

    // 1. Fetch content source
    const contentSource = await this.contentSourceRepository.findOne({
      where: { id: contentSourceId },
    });

    if (!contentSource) {
      throw new Error('Content source not found');
    }

    if (contentSource.type !== 'url' || !contentSource.sourceUrl) {
      throw new Error('Content source must be a URL type');
    }

    // 2. Fetch webpage content (we'll need to scrape it)
    // For now, use summary or fullText if available
    let webpageContent = contentSource.fullText || contentSource.summary || '';
    
    // If no content, try to fetch from URL (future enhancement)
    if (!webpageContent && contentSource.sourceUrl) {
      this.logger.warn('[ContentAnalyzer] ⚠️ No webpage content available, attempting to fetch...');
      // TODO: Add web scraping here if needed
      webpageContent = `Webpage URL: ${contentSource.sourceUrl}`;
    }

    // 3. Get active LLM provider
    const provider = await this.llmProviderRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (!provider) {
      this.logger.error('[ContentAnalyzer] ❌ No active LLM provider configured');
      throw new Error('No active LLM provider configured');
    }

    // 4. Get iframe guide URL analysis prompt from database
    const dbPrompt = await this.aiPromptRepository.findOne({
      where: { 
        assistantId: 'content-analyzer', 
        promptKey: 'iframeGuideUrlAnalysis', 
        isActive: true 
      },
    });

    if (!dbPrompt) {
      this.logger.warn('[ContentAnalyzer] ⚠️ No iframe guide URL analysis prompt found in database');
      throw new Error('iFrame Guide URL Analysis Prompt not configured. Please add it in Super Admin > AI Prompts > Content Analyzer.');
    }

    const promptTemplate = dbPrompt.content;

    // 5. Call LLM to analyze the webpage
    this.logger.log(`[ContentAnalyzer] 🤖 Calling ${provider.name} for iframe guide URL analysis...`);
    const startTime = Date.now();
    
    try {
      const response = (await firstValueFrom(
        this.httpService.post(
          provider.apiEndpoint,
          {
            model: provider.modelName,
            messages: [
              {
                role: 'system',
                content: 'You are an expert at analyzing webpages for game play and app navigation guidance. Return valid JSON only.',
              },
              {
                role: 'user',
                content: `${promptTemplate}\n\nWebpage URL: ${contentSource.sourceUrl}\n\nWebpage Content:\n${webpageContent}`,
              },
            ],
            temperature: parseFloat(provider.temperature as any),
            max_tokens: Math.min(provider.maxTokens, 2000),
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${provider.apiKey}`,
            },
          },
        ),
      )) as AxiosResponse<any>;

      const llmResponse = response.data as any;
      const tokensUsed = llmResponse.usage?.total_tokens || 0;
      const messageContent = llmResponse.choices?.[0]?.message?.content;

      if (!messageContent) {
        this.logger.error('[ContentAnalyzer] ❌ No content in LLM response');
        return null;
      }

      // Parse JSON from response
      const jsonMatch = messageContent.match(/```json\n([\s\S]*?)\n```/) ||
        messageContent.match(/```\n([\s\S]*?)\n```/) ||
        [null, messageContent];
      
      const jsonStr = jsonMatch[1] || messageContent;
      const parsed = JSON.parse(jsonStr.trim());

      const processingTime = Date.now() - startTime;

      // 6. Log token usage
      await this.logTokenUsage({
        contentSourceId,
        userId,
        tenantId: contentSource.tenantId,
        providerId: provider.id,
        useCase: 'content-analyzer', // Track as Content Analyzer usage
        promptText: promptTemplate.substring(0, 500) + '...',
        response: parsed,
        tokensUsed,
        processingTimeMs: processingTime,
        outputsGenerated: parsed.hasGuidance ? 1 : 0,
      });

      // 7. Create processed content output if guidance was found
      if (parsed.hasGuidance && parsed.guidance) {
        // Check if processed output already exists for this content source and output type
        const existingOutput = await this.processedContentRepository.findOne({
          where: {
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
          },
        });

        const sourceTitle = contentSource.title || contentSource.sourceUrl || 'Content';
        const outputName = `${sourceTitle} - processed for interactions`;

        if (existingOutput) {
          // Update existing output instead of creating duplicate
          existingOutput.outputName = outputName;
          existingOutput.outputData = {
            guidance: parsed.guidance,
            sourceUrl: contentSource.sourceUrl,
            _metadata: {
              tokensUsed,
              generatedBy: 'llm-auto',
              generatedAt: existingOutput.outputData?._metadata?.generatedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
          existingOutput.description = parsed.guidance.instructions || 'iFrame guide content extracted from webpage';
          existingOutput.notes = `Auto-generated from iframe guide URL analysis (updated)`;
          existingOutput.createdBy = userId;
          
          await this.processedContentRepository.save(existingOutput);
          this.logger.log(`[ContentAnalyzer] 🔄 Updated existing processed content output for iframe guide URL`);
        } else {
          // Create new output
          const processedOutput = this.processedContentRepository.create({
            lessonId: '00000000-0000-0000-0000-000000000000', // Placeholder
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
            outputName: outputName,
            outputData: {
              guidance: parsed.guidance,
              sourceUrl: contentSource.sourceUrl,
              _metadata: {
                tokensUsed,
                generatedBy: 'llm-auto',
                generatedAt: new Date().toISOString(),
              },
            },
            description: parsed.guidance.instructions || 'iFrame guide content extracted from webpage',
            notes: `Auto-generated from iframe guide URL analysis`,
            createdBy: userId,
          });

          await this.processedContentRepository.save(processedOutput);
          this.logger.log(`[ContentAnalyzer] ✅ Processed content output created for iframe guide URL`);
        }
        
        return {
          success: true,
          hasGuidance: true,
          processedOutputId: processedOutput.id,
          guidance: parsed.guidance,
        };
      } else {
        this.logger.log(`[ContentAnalyzer] ℹ️ No guidance found for iframe guide URL`);
        return {
          success: true,
          hasGuidance: false,
          message: parsed.message || 'No guidance for web app navigation or game play found',
        };
      }
    } catch (error) {
      this.logger.error(`[ContentAnalyzer] ❌ LLM API error:`, error.message);
      if (error.response?.data) {
        this.logger.error('[ContentAnalyzer] Response:', JSON.stringify(error.response.data));
      }
      throw error;
    }
  }
}

