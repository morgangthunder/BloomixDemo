import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InteractionType } from '../entities/interaction-type.entity';
import { ContentSource } from '../entities/content-source.entity';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';

interface AnalysisResult {
  interactionTypeId: string;
  confidence: number;
  output: any;
  tokensUsed: number;
}

@Injectable()
export class ContentAnalyzerService {
  private readonly logger = new Logger(ContentAnalyzerService.name);
  private readonly grokApiUrl = 'https://api.x.ai/v1/chat/completions';
  private readonly grokApiKey = process.env.GROK_API_KEY || '';

  constructor(
    @InjectRepository(InteractionType)
    private interactionTypeRepository: Repository<InteractionType>,
    @InjectRepository(ContentSource)
    private contentSourceRepository: Repository<ContentSource>,
    @InjectRepository(ProcessedContentOutput)
    private processedContentRepository: Repository<ProcessedContentOutput>,
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
      where: { id: 'fragment-builder', isActive: true },
    });

    if (!fragmentBuilder) {
      this.logger.error('[ContentAnalyzer] ❌ Fragment Builder interaction type not found');
      return [];
    }

    // 4. Generate Fragment Builder output via Grok
    this.logger.log('[ContentAnalyzer] 🤖 Calling Grok API for Fragment Builder generation...');
    const result = await this.generateFragmentBuilder(
      contentText,
      fragmentBuilder.generationPrompt,
    );

    if (!result) {
      return [];
    }

    // 5. Validate and save if confidence >= threshold
    if (result.confidence >= fragmentBuilder.minConfidence) {
      await this.saveProcessedOutput({
        contentSourceId,
        interactionTypeId: 'fragment-builder',
        output: result.output,
        confidence: result.confidence,
        tokensUsed: result.tokensUsed,
        userId,
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
   * Generate Fragment Builder interaction using Grok API
   */
  private async generateFragmentBuilder(
    contentText: string,
    promptTemplate: string,
  ): Promise<AnalysisResult | null> {
    try {
      // Replace {contentText} in prompt template
      const prompt = promptTemplate.replace('{contentText}', contentText);

      // Call Grok API
      const response = await firstValueFrom(
        this.httpService.post(
          this.grokApiUrl,
          {
            model: 'grok-beta',
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
            temperature: 0.7,
            max_tokens: 1000,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.grokApiKey}`,
            },
          },
        ),
      );

      const grokResponse = response.data;
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

      this.logger.log(`[ContentAnalyzer] 📊 Grok tokens used: ${tokensUsed}`);

      return {
        interactionTypeId: 'fragment-builder',
        confidence: parsed.confidence || 0,
        output: parsed.output || parsed,
        tokensUsed,
      };
    } catch (error) {
      this.logger.error('[ContentAnalyzer] ❌ Grok API error:', error.message);
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
   * Save processed output to database
   */
  private async saveProcessedOutput(data: {
    contentSourceId: string;
    interactionTypeId: string;
    output: any;
    confidence: number;
    tokensUsed: number;
    userId: string;
  }) {
    const processedOutput = this.processedContentRepository.create({
      contentSourceId: data.contentSourceId,
      type: data.interactionTypeId,
      outputName: data.output.targetStatement || 'Fragment Builder Output',
      outputData: data.output,
      status: 'draft', // Requires approval
      metadata: {
        confidence: data.confidence,
        tokensUsed: data.tokensUsed,
        generatedBy: 'llm-auto',
        generatedAt: new Date().toISOString(),
      },
      createdBy: data.userId,
      tenantId: '00000000-0000-0000-0000-000000000001', // TODO: Get from user context
    });

    await this.processedContentRepository.save(processedOutput);
    this.logger.log(`[ContentAnalyzer] 💾 Saved processed output (status: draft)`);
  }
}

