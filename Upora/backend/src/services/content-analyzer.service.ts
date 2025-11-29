import { Injectable, Logger } from '@nestjs/common';
import { DEFAULT_LESSON_ID } from '../constants/default-lesson-id';
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
   * Get all active interaction types with their sample data for prompt context
   */
  private async getInteractionTypesWithSamples(): Promise<Array<{ id: string; name: string; sampleData: any }>> {
    const interactionTypes = await this.interactionTypeRepository.find({
      where: { isActive: true },
      select: ['id', 'name', 'sampleData'],
    });

    return interactionTypes
      .filter(it => it.sampleData) // Only include interactions with sample data
      .map(it => ({
        id: it.id,
        name: it.name,
        sampleData: it.sampleData,
      }));
  }

  /**
   * Format interaction types and sample data for inclusion in LLM prompts
   */
  private formatInteractionSamplesForPrompt(interactions: Array<{ id: string; name: string; sampleData: any }>): string {
    if (interactions.length === 0) {
      return '\n\nNo interaction types with sample data are currently available.';
    }

    let formatted = '\n\n=== AVAILABLE INTERACTION TYPES AND THEIR SAMPLE INPUT DATA FORMATS ===\n\n';
    formatted += 'You MUST follow these exact formats when constructing input data sets:\n\n';

    interactions.forEach((interaction, index) => {
      formatted += `${index + 1}. Interaction Type: "${interaction.name}" (ID: ${interaction.id})\n`;
      formatted += `   Sample Input Data Format:\n`;
      formatted += `   ${JSON.stringify(interaction.sampleData, null, 2).split('\n').join('\n   ')}\n\n`;
    });

    formatted += '=== END OF INTERACTION TYPES ===\n';
    return formatted;
  }

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

    // 5. Get prompt from database based on content source type
    const promptKey = this.getPromptKeyForContentType(contentSource.type);
    const dbPrompt = await this.aiPromptRepository.findOne({
      where: { 
        assistantId: 'content-analyzer', 
        promptKey: promptKey, 
        isActive: true 
      },
    });
    
    let promptToUse = dbPrompt?.content;
    
    if (!promptToUse) {
      // Fallback to interaction type's default prompt
      promptToUse = fragmentBuilder.generationPrompt;
      this.logger.log(`[ContentAnalyzer] ⚠️ No DB prompt found for ${promptKey}, using interaction type default`);
    } else {
      this.logger.log(`[ContentAnalyzer] 📝 Using prompt from database (${promptKey})`);
    }

    // 6. Append interaction sample data to prompt (except for iframe guide prompts)
    if (!promptKey.includes('iframeGuide')) {
      const interactionSamples = await this.getInteractionTypesWithSamples();
      const samplesText = this.formatInteractionSamplesForPrompt(interactionSamples);
      promptToUse = promptToUse + samplesText;
      this.logger.log(`[ContentAnalyzer] 📋 Appended ${interactionSamples.length} interaction sample formats to prompt`);
    }

    // 7. Generate True/False Selection output using active provider
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

    // 8. Log token usage to database
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

    // 9. Always save processed output (even if confidence is low) to ensure approval can succeed
    // This matches the behavior of iframe guide URLs - always create processed content
    await this.saveProcessedOutput({
      contentSourceId,
      interactionTypeId: 'true-false-selection',
      output: result.output,
      confidence: result.confidence,
      tokensUsed: result.tokensUsed,
      userId,
      tenantId: contentSource.tenantId,
    });

    if (result.confidence >= fragmentBuilder.minConfidence) {
      this.logger.log(
        `[ContentAnalyzer] ✅ Fragment Builder output generated (confidence: ${result.confidence})`,
      );
    } else {
      this.logger.warn(
        `[ContentAnalyzer] ⚠️ Confidence ${result.confidence} below threshold ${fragmentBuilder.minConfidence}, but processed content created anyway for approval`,
      );
    }
    
    return [result];
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

      // Log the actual LLM response for debugging
      this.logger.log(`[ContentAnalyzer] 📊 ${provider.name} tokens used: ${tokensUsed}`);
      this.logger.log(`[ContentAnalyzer] 🔍 LLM Response Structure:`, JSON.stringify({
        hasOutput: !!parsed.output,
        hasRankedSuggestions: !!(parsed.output?.rankedSuggestions || parsed.rankedSuggestions),
        rankedSuggestionsCount: (parsed.output?.rankedSuggestions || parsed.rankedSuggestions || []).length,
        topLevelKeys: Object.keys(parsed),
        sampleRankedSuggestion: parsed.output?.rankedSuggestions?.[0] || parsed.rankedSuggestions?.[0] || null,
      }, null, 2));
      
      // Log the FULL parsed response for debugging
      this.logger.log(`[ContentAnalyzer] 📋 FULL LLM Response (first 2000 chars):`, JSON.stringify(parsed, null, 2).substring(0, 2000));
      
      // Log what will be saved
      const outputToSave = parsed.output || parsed;
      this.logger.log(`[ContentAnalyzer] 💾 Output to save structure:`, JSON.stringify({
        hasRankedSuggestions: !!outputToSave.rankedSuggestions,
        rankedSuggestionsCount: outputToSave.rankedSuggestions?.length || 0,
        keys: Object.keys(outputToSave),
        firstSuggestion: outputToSave.rankedSuggestions?.[0] || null,
      }, null, 2));

      // Extract confidence score:
      // 1. Try top-level confidence first
      // 2. If not found, try to get highest confidence from rankedSuggestions
      // 3. Default to 0 if neither exists
      let confidence = parsed.confidence;
      
      if (confidence === undefined || confidence === null || confidence === 0) {
        // Try to extract from rankedSuggestions if available
        const output = parsed.output || parsed;
        if (output.rankedSuggestions && Array.isArray(output.rankedSuggestions) && output.rankedSuggestions.length > 0) {
          // Get the highest confidence from the suggestions
          const confidences = output.rankedSuggestions
            .map((s: any) => s.confidence)
            .filter((c: any) => typeof c === 'number' && c > 0);
          
          if (confidences.length > 0) {
            confidence = Math.max(...confidences);
            this.logger.log(`[ContentAnalyzer] 📈 Extracted confidence ${confidence} from rankedSuggestions`);
          }
        }
      }
      
      // Default to 0 if still not found
      confidence = confidence || 0;

      // Log token usage for dashboard (Note: userId and tenantId passed from calling method)
      // This is logged separately in analyzeContentSource method

      return {
        interactionTypeId: 'true-false-selection',
        confidence: confidence,
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
   * Get the prompt key for a given content source type
   */
  private getPromptKeyForContentType(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'pdf': 'pdfAnalysis',
      'url': 'urlAnalysis',
      'text': 'textAnalysis',
      'image': 'textAnalysis', // Images are analyzed as text (OCR)
      'api': 'urlAnalysis', // API responses analyzed like URLs
    };
    return typeMap[contentType] || 'textAnalysis';
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
      outputName = `${sourceTitle} - processed content`;
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
      
      // Log what's being saved
      this.logger.log(`[ContentAnalyzer] 💾 Saving outputData:`, JSON.stringify({
        hasRankedSuggestions: !!existingOutput.outputData.rankedSuggestions,
        rankedSuggestionsCount: existingOutput.outputData.rankedSuggestions?.length || 0,
        keys: Object.keys(existingOutput.outputData),
        firstSuggestion: existingOutput.outputData.rankedSuggestions?.[0] || null,
      }, null, 2));
      
      await this.processedContentRepository.save(existingOutput);
      this.logger.log(`[ContentAnalyzer] 🔄 Updated existing processed output (outputType: ${data.interactionTypeId})`);
    } else {
      // Create new output
      const outputDataToSave = {
        ...data.output,
        _metadata: {
          confidence: data.confidence,
          tokensUsed: data.tokensUsed,
          generatedBy: 'llm-auto',
          generatedAt: new Date().toISOString(),
        },
      };
      
      // Log what's being saved
      this.logger.log(`[ContentAnalyzer] 💾 Saving outputData:`, JSON.stringify({
        hasRankedSuggestions: !!outputDataToSave.rankedSuggestions,
        rankedSuggestionsCount: outputDataToSave.rankedSuggestions?.length || 0,
        keys: Object.keys(outputDataToSave),
        firstSuggestion: outputDataToSave.rankedSuggestions?.[0] || null,
      }, null, 2));
      
      const processedOutput = this.processedContentRepository.create({
        lessonId: DEFAULT_LESSON_ID, // Default - not linked to specific lesson yet
        contentSourceId: data.contentSourceId,
        outputType: data.interactionTypeId,
        outputName: outputName,
        outputData: outputDataToSave,
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

    // Log content source data for debugging
    this.logger.log(`[ContentAnalyzer] 📋 Content source data: id=${contentSource.id}, title="${contentSource.title || 'NULL'}", sourceUrl="${contentSource.sourceUrl || 'NULL'}", type=${contentSource.type}`);

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
      const warningMsg = `⚠️ WARNING: No iframe guide URL analysis prompt found in database.
      
ROOT CAUSE: The 'iFrame Guide URL Analysis Prompt' is not configured in Super Admin > AI Prompts > Content Analyzer.

POSSIBLE REASONS:
1. Prompt was never created
2. Prompt was deleted
3. Prompt is not active

ACTION REQUIRED: Please configure the 'iFrame Guide URL Analysis Prompt' in Super Admin > AI Prompts > Content Analyzer for proper iframe guide URL processing.

CONTENT SOURCE: ${contentSourceId}
URL: ${contentSource.sourceUrl}`;
      
      this.logger.warn(warningMsg);
      console.warn('═══════════════════════════════════════════════════════════');
      console.warn(warningMsg);
      console.warn('═══════════════════════════════════════════════════════════');
      
      this.logger.log('[ContentAnalyzer] 🔄 Falling back to standard content analysis for iframe guide URL');
      // Fall back to standard content analysis if prompt is not configured
      const results = await this.analyzeContentSource(contentSourceId, userId);
      
      // Always create processed content, even if standard analysis fails
      let processedOutputId: string | null = null;
      
      if (results && results.length > 0) {
        // Get the processed output ID that was created
        const processedOutput = await this.processedContentRepository.findOne({
          where: {
            contentSourceId: contentSourceId,
            outputType: 'true-false-selection', // Standard analysis creates this type
          },
          order: { createdAt: 'DESC' },
        });
        
        processedOutputId = processedOutput?.id || null;
      }
      
      // If no processed output was created by standard analysis, create one now
      if (!processedOutputId) {
        this.logger.log('[ContentAnalyzer] 🔄 Creating processed content output (fallback - no prompt configured)');
        const sourceTitle = contentSource.title || contentSource.sourceUrl || 'Content';
        const outputName = `${sourceTitle} - processed content`;
        
        const existingOutput = await this.processedContentRepository.findOne({
          where: {
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
          },
        });

        if (existingOutput) {
          existingOutput.outputName = outputName;
          existingOutput.outputData = {
            hasGuidance: false,
            error: 'iFrame Guide URL Analysis Prompt not configured',
            message: 'Please configure the iFrame Guide URL Analysis Prompt in Super Admin > AI Prompts > Content Analyzer',
            sourceUrl: contentSource.sourceUrl,
            _metadata: {
              tokensUsed: 0,
              generatedBy: 'llm-auto',
              generatedAt: existingOutput.outputData?._metadata?.generatedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
          existingOutput.description = 'Processing skipped - prompt not configured';
          existingOutput.notes = `Auto-generated from iframe guide URL analysis - prompt not configured (updated)`;
          existingOutput.createdBy = userId;
          
          await this.processedContentRepository.save(existingOutput);
          processedOutputId = existingOutput.id;
        } else {
          const processedOutput = this.processedContentRepository.create({
            lessonId: '00000000-0000-0000-0000-000000000000',
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
            outputName: outputName,
            outputData: {
              hasGuidance: false,
              error: 'iFrame Guide URL Analysis Prompt not configured',
              message: 'Please configure the iFrame Guide URL Analysis Prompt in Super Admin > AI Prompts > Content Analyzer',
              sourceUrl: contentSource.sourceUrl,
              _metadata: {
                tokensUsed: 0,
                generatedBy: 'llm-auto',
                generatedAt: new Date().toISOString(),
              },
            },
            description: 'Processing skipped - prompt not configured',
            notes: `Auto-generated from iframe guide URL analysis - prompt not configured`,
            createdBy: userId,
          });

          await this.processedContentRepository.save(processedOutput);
          processedOutputId = processedOutput.id;
        }
      }
      
      return {
        success: true,
        hasGuidance: !!processedOutputId && results && results.length > 0,
        processedOutputId: processedOutputId,
        message: processedOutputId 
          ? 'Processed using standard content analysis (iframe guide prompt not configured)' 
          : 'No content could be processed. Please configure the iFrame Guide URL Analysis Prompt in Super Admin > AI Prompts > Content Analyzer for better results.',
      };
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
        const errorMsg = `❌ ERROR: No content in LLM response for iframe guide URL analysis.
        
ROOT CAUSE: The LLM API returned a response but the 'choices[0].message.content' field was empty or undefined.

POSSIBLE REASONS:
1. LLM provider API format changed or response structure is unexpected
2. LLM provider rate limiting or quota exceeded
3. LLM provider returned an error response that wasn't properly handled
4. Network issue causing incomplete response

RESPONSE DATA: ${JSON.stringify(llmResponse, null, 2)}
PROVIDER: ${provider.name} (${provider.apiEndpoint})
CONTENT SOURCE: ${contentSourceId}
URL: ${contentSource.sourceUrl}`;
        
        this.logger.error(errorMsg);
        console.error('═══════════════════════════════════════════════════════════');
        console.error(errorMsg);
        console.error('═══════════════════════════════════════════════════════════');
        
        // Still create processed content even when LLM response is empty
        const sourceTitle = contentSource.title || contentSource.sourceUrl || 'Content';
        const outputName = `${sourceTitle} - processed content`;
        
        // Log for debugging if title/URL are missing
        if (!contentSource.title && !contentSource.sourceUrl) {
          this.logger.warn(`[ContentAnalyzer] ⚠️ Content source ${contentSourceId} has no title or sourceUrl - using fallback 'Content'`);
          this.logger.warn(`[ContentAnalyzer] Content source data: ${JSON.stringify({ id: contentSource.id, type: contentSource.type, hasTitle: !!contentSource.title, hasSourceUrl: !!contentSource.sourceUrl })}`);
        }
        
        const processedOutput = this.processedContentRepository.create({
          lessonId: '00000000-0000-0000-0000-000000000000',
          contentSourceId: contentSourceId,
          outputType: 'iframe-guide',
          outputName: outputName,
          outputData: {
            hasGuidance: false,
            error: 'No content in LLM response',
            errorDetails: errorMsg,
            sourceUrl: contentSource.sourceUrl,
            _metadata: {
              tokensUsed: 0,
              generatedBy: 'llm-auto',
              generatedAt: new Date().toISOString(),
            },
          },
          description: 'Processing failed - no LLM response',
          notes: `Auto-generated from iframe guide URL analysis - LLM returned no content`,
          createdBy: userId,
        });

        await this.processedContentRepository.save(processedOutput);
        this.logger.log(`[ContentAnalyzer] ✅ Processed content output created despite LLM error (ID: ${processedOutput.id})`);
        
        return {
          success: true,
          hasGuidance: false,
          processedOutputId: processedOutput.id,
          message: 'LLM returned no content - processed content created with error status',
        };
      }

      // Parse JSON from response
      let parsed: any;
      try {
        const jsonMatch = messageContent.match(/```json\n([\s\S]*?)\n```/) ||
          messageContent.match(/```\n([\s\S]*?)\n```/) ||
          [null, messageContent];
        
        const jsonStr = jsonMatch[1] || messageContent;
        parsed = JSON.parse(jsonStr.trim());
      } catch (parseError: any) {
        const errorMsg = `❌ ERROR: Failed to parse LLM response as JSON for iframe guide URL analysis.
        
ROOT CAUSE: The LLM returned content that is not valid JSON or has syntax errors.

POSSIBLE REASONS:
1. LLM returned plain text instead of JSON (e.g., "No guidance found" instead of {"hasGuidance": false})
2. LLM returned malformed JSON (missing quotes, brackets, etc.)
3. LLM response contains special characters that break JSON parsing
4. Prompt not instructing LLM to return valid JSON format

RAW RESPONSE: ${messageContent.substring(0, 500)}${messageContent.length > 500 ? '...' : ''}
PARSE ERROR: ${parseError.message}
PROVIDER: ${provider.name}
CONTENT SOURCE: ${contentSourceId}
URL: ${contentSource.sourceUrl}`;
        
        this.logger.error(errorMsg);
        console.error('═══════════════════════════════════════════════════════════');
        console.error(errorMsg);
        console.error('═══════════════════════════════════════════════════════════');
        
        // If parsing fails, treat the response as a plain text message
        parsed = {
          hasGuidance: false,
          message: messageContent.trim() || 'No guidance for web app navigation or game play found',
        };
      }

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
        let processedOutputId: string | null = null;
        // Check if processed output already exists for this content source and output type
        const existingOutput = await this.processedContentRepository.findOne({
          where: {
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
          },
        });

        // Get content source title/URL for naming - ensure we have the data
        const sourceTitle = contentSource.title || contentSource.sourceUrl || 'Content';
        const outputName = `${sourceTitle} - processed content`;
        
        // Log for debugging if title/URL are missing
        if (!contentSource.title && !contentSource.sourceUrl) {
          this.logger.warn(`[ContentAnalyzer] ⚠️ Content source ${contentSourceId} has no title or sourceUrl - using fallback 'Content'`);
          this.logger.warn(`[ContentAnalyzer] Content source data: ${JSON.stringify({ id: contentSource.id, type: contentSource.type, hasTitle: !!contentSource.title, hasSourceUrl: !!contentSource.sourceUrl })}`);
        }

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
          processedOutputId = existingOutput.id;
          this.logger.log(`[ContentAnalyzer] 🔄 Updated existing processed content output for iframe guide URL`);
        } else {
          // Create new output
          this.logger.log(`[ContentAnalyzer] 📝 Creating processed output with outputName: "${outputName}" (sourceTitle: "${sourceTitle}")`);
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
          processedOutputId = processedOutput.id;
          this.logger.log(`[ContentAnalyzer] ✅ Processed content output created for iframe guide URL (ID: ${processedOutputId}, outputName: "${processedOutput.outputName}")`);
          
          // Verify outputName was saved correctly
          const savedOutput = await this.processedContentRepository.findOne({ where: { id: processedOutputId } });
          if (savedOutput && savedOutput.outputName !== outputName) {
            this.logger.error(`[ContentAnalyzer] ❌ CRITICAL: outputName mismatch! Expected: "${outputName}", Got: "${savedOutput.outputName}"`);
          } else if (savedOutput) {
            this.logger.log(`[ContentAnalyzer] ✅ Verified outputName saved correctly: "${savedOutput.outputName}"`);
          }
        }
        
        return {
          success: true,
          hasGuidance: true,
          processedOutputId,
          guidance: parsed.guidance,
        };
      } else {
        const warningMsg = `⚠️ WARNING: No guidance found in iframe guide URL analysis.
        
ROOT CAUSE: The LLM analyzed the webpage but did not find any guidance for web app navigation or game play.

POSSIBLE REASONS:
1. The webpage genuinely doesn't contain navigation/game play guidance
2. The webpage content wasn't properly extracted (check if fullText/summary is populated)
3. The LLM prompt needs adjustment to better identify guidance
4. The webpage structure makes it difficult for LLM to extract guidance

LLM RESPONSE: ${JSON.stringify(parsed, null, 2)}
CONTENT SOURCE: ${contentSourceId}
URL: ${contentSource.sourceUrl}
HAS FULL TEXT: ${!!contentSource.fullText}
HAS SUMMARY: ${!!contentSource.summary}
FULL TEXT LENGTH: ${contentSource.fullText?.length || 0}`;
        
        this.logger.warn(warningMsg);
        console.warn('═══════════════════════════════════════════════════════════');
        console.warn(warningMsg);
        console.warn('═══════════════════════════════════════════════════════════');
        
        // Still create processed content even when no guidance is found
        const sourceTitle = contentSource.title || contentSource.sourceUrl || 'Content';
        const outputName = `${sourceTitle} - processed content`;
        
        // Log for debugging if title/URL are missing
        if (!contentSource.title && !contentSource.sourceUrl) {
          this.logger.warn(`[ContentAnalyzer] ⚠️ Content source ${contentSourceId} has no title or sourceUrl - using fallback 'Content'`);
          this.logger.warn(`[ContentAnalyzer] Content source data: ${JSON.stringify({ id: contentSource.id, type: contentSource.type, hasTitle: !!contentSource.title, hasSourceUrl: !!contentSource.sourceUrl })}`);
        }
        
        // Check if processed output already exists
        const existingOutput = await this.processedContentRepository.findOne({
          where: {
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
          },
        });

        if (existingOutput) {
          // Update existing output
          existingOutput.outputName = outputName;
          existingOutput.outputData = {
            hasGuidance: false,
            message: parsed.message || 'No guidance for web app navigation or game play found',
            sourceUrl: contentSource.sourceUrl,
            _metadata: {
              tokensUsed,
              generatedBy: 'llm-auto',
              generatedAt: existingOutput.outputData?._metadata?.generatedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
          existingOutput.description = 'No guidance found in webpage';
          existingOutput.notes = `Auto-generated from iframe guide URL analysis - no guidance found (updated)`;
          existingOutput.createdBy = userId;
          
          await this.processedContentRepository.save(existingOutput);
          this.logger.log(`[ContentAnalyzer] 🔄 Updated existing processed content output (no guidance found)`);
          
          return {
            success: true,
            hasGuidance: false,
            processedOutputId: existingOutput.id,
            message: parsed.message || 'No guidance for web app navigation or game play found',
          };
        } else {
          // Create new output even though no guidance was found
          const processedOutput = this.processedContentRepository.create({
            lessonId: '00000000-0000-0000-0000-000000000000', // Placeholder
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
            outputName: outputName,
            outputData: {
              hasGuidance: false,
              message: parsed.message || 'No guidance for web app navigation or game play found',
              sourceUrl: contentSource.sourceUrl,
              _metadata: {
                tokensUsed,
                generatedBy: 'llm-auto',
                generatedAt: new Date().toISOString(),
              },
            },
            description: 'No guidance found in webpage',
            notes: `Auto-generated from iframe guide URL analysis - no guidance found`,
            createdBy: userId,
          });

          await this.processedContentRepository.save(processedOutput);
          this.logger.log(`[ContentAnalyzer] ✅ Processed content output created (no guidance found)`);
          
          return {
            success: true,
            hasGuidance: false,
            processedOutputId: processedOutput.id,
            message: parsed.message || 'No guidance for web app navigation or game play found',
          };
        }
      }
    } catch (error: any) {
      const errorMsg = `❌ ERROR: LLM API error during iframe guide URL analysis.
      
ROOT CAUSE: The LLM API call failed or returned an error response.

POSSIBLE REASONS:
1. LLM provider API key is invalid or expired
2. LLM provider API endpoint is incorrect or unreachable
3. LLM provider rate limiting or quota exceeded
4. Network connectivity issues
5. LLM provider service is down or experiencing issues
6. Request payload is malformed or exceeds size limits

ERROR MESSAGE: ${error.message}
ERROR STACK: ${error.stack}
PROVIDER: ${provider.name}
API ENDPOINT: ${provider.apiEndpoint}
API KEY PRESENT: ${!!provider.apiKey}
API KEY LENGTH: ${provider.apiKey?.length || 0}
CONTENT SOURCE: ${contentSourceId}
URL: ${contentSource.sourceUrl}
RESPONSE DATA: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'N/A'}
STATUS CODE: ${error.response?.status || 'N/A'}`;
      
      this.logger.error(errorMsg);
      console.error('═══════════════════════════════════════════════════════════');
      console.error(errorMsg);
      console.error('═══════════════════════════════════════════════════════════');
      
      // Even on error, create processed content so approval can succeed
      this.logger.log(`[ContentAnalyzer] 🔄 Creating processed content despite error`);
      try {
        const sourceTitle = contentSource.title || contentSource.sourceUrl || 'Content';
        const outputName = `${sourceTitle} - processed content`;
        
        // Log for debugging if title/URL are missing
        if (!contentSource.title && !contentSource.sourceUrl) {
          this.logger.warn(`[ContentAnalyzer] ⚠️ Content source ${contentSourceId} has no title or sourceUrl - using fallback 'Content'`);
          this.logger.warn(`[ContentAnalyzer] Content source data: ${JSON.stringify({ id: contentSource.id, type: contentSource.type, hasTitle: !!contentSource.title, hasSourceUrl: !!contentSource.sourceUrl })}`);
        }
        
        // Check if processed output already exists
        const existingOutput = await this.processedContentRepository.findOne({
          where: {
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
          },
        });

        if (existingOutput) {
          // Update existing output
          existingOutput.outputName = outputName;
          existingOutput.outputData = {
            hasGuidance: false,
            error: error.message || 'Processing error occurred',
            errorDetails: errorMsg,
            sourceUrl: contentSource.sourceUrl,
            _metadata: {
              tokensUsed: 0,
              generatedBy: 'llm-auto',
              generatedAt: existingOutput.outputData?._metadata?.generatedAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
          existingOutput.description = 'Processing error occurred';
          existingOutput.notes = `Auto-generated from iframe guide URL analysis - error: ${error.message}`;
          existingOutput.createdBy = userId;
          
          await this.processedContentRepository.save(existingOutput);
          this.logger.log(`[ContentAnalyzer] 🔄 Updated existing processed content output (error occurred)`);
          
          return {
            success: true,
            hasGuidance: false,
            processedOutputId: existingOutput.id,
            message: `Processing error: ${error.message}`,
          };
        } else {
          // Create new output with error status
          const processedOutput = this.processedContentRepository.create({
            lessonId: '00000000-0000-0000-0000-000000000000',
            contentSourceId: contentSourceId,
            outputType: 'iframe-guide',
            outputName: outputName,
            outputData: {
              hasGuidance: false,
              error: error.message || 'Processing error occurred',
              errorDetails: errorMsg,
              sourceUrl: contentSource.sourceUrl,
              _metadata: {
                tokensUsed: 0,
                generatedBy: 'llm-auto',
                generatedAt: new Date().toISOString(),
              },
            },
            description: 'Processing error occurred',
            notes: `Auto-generated from iframe guide URL analysis - error: ${error.message}`,
            createdBy: userId,
          });

          await this.processedContentRepository.save(processedOutput);
          this.logger.log(`[ContentAnalyzer] ✅ Processed content output created despite error (ID: ${processedOutput.id})`);
          
          return {
            success: true,
            hasGuidance: false,
            processedOutputId: processedOutput.id,
            message: `Processing error: ${error.message}`,
          };
        }
      } catch (createError) {
        this.logger.error(`[ContentAnalyzer] ❌ Failed to create processed content after error: ${createError.message}`);
        // If we can't even create processed content, throw the original error
        throw error;
      }
    }
  }
}

