import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPrompt } from '../entities/ai-prompt.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { LlmProvider } from '../entities/llm-provider.entity';

export interface ImageGenerationRequest {
  prompt: string;
  userInput?: string; // Additional user input to append to prompt
  screenshot?: string; // Optional base64-encoded screenshot
  customInstructions?: string; // Builder-defined custom instructions
}

export interface ImageGenerationResponse {
  imageUrl?: string; // URL to the generated image
  imageData?: string; // Base64-encoded image data (if returned directly)
  success: boolean;
  error?: string;
  requestId?: string;
}

/**
 * Image Generator Service
 * Uses Google Gemini API (gemini-2.5-flash-image) for image generation
 * API configuration is stored in ai_prompts table with key 'image-generator.api-config'
 */
@Injectable()
export class ImageGeneratorService {
  private readonly logger = new Logger(ImageGeneratorService.name);

  constructor(
    @InjectRepository(AiPrompt)
    private aiPromptRepository: Repository<AiPrompt>,
    @InjectRepository(LlmGenerationLog)
    private llmLogRepository: Repository<LlmGenerationLog>,
    @InjectRepository(LlmProvider)
    private llmProviderRepository: Repository<LlmProvider>,
  ) {}

  /**
   * Get API configuration from database
   */
  private async getApiConfig(): Promise<{
    apiEndpoint: string;
    apiKey: string;
    apiKeyHeader?: string; // e.g., 'Authorization' or 'X-API-Key'
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any; // Allow additional config fields
  } | null> {
    try {
      const configPrompt = await this.aiPromptRepository.findOne({
        where: {
          assistantId: 'image-generator',
          promptKey: 'api-config',
          isActive: true,
        },
      });

      if (!configPrompt || !configPrompt.content) {
        this.logger.warn('[ImageGenerator] No API config found. Please configure at /super-admin/ai-prompts?assistant=image-generator');
        return null;
      }

      try {
        const config = JSON.parse(configPrompt.content);
        return config;
      } catch (error) {
        this.logger.error('[ImageGenerator] Failed to parse API config JSON:', error);
        return null;
      }
    } catch (error) {
      this.logger.error('[ImageGenerator] Error loading API config:', error);
      return null;
    }
  }

  /**
   * Get the base prompt template for image generation
   */
  private async getPromptTemplate(): Promise<string | null> {
    try {
      const prompt = await this.aiPromptRepository.findOne({
        where: {
          assistantId: 'image-generator',
          promptKey: 'default',
          isActive: true,
        },
      });

      return prompt?.content || null;
    } catch (error) {
      this.logger.error('[ImageGenerator] Error loading prompt template:', error);
      return null;
    }
  }

  /**
   * Generate an image using nano-banana LLM API
   */
  async generateImage(
    request: ImageGenerationRequest,
    userId?: string,
    tenantId?: string,
  ): Promise<ImageGenerationResponse> {
    const startTime = Date.now();
    this.logger.log('[ImageGenerator] Generating image with prompt:', request.prompt.substring(0, 100));

    // 1. Get API configuration
    const apiConfig = await this.getApiConfig();
    if (!apiConfig || !apiConfig.apiEndpoint || !apiConfig.apiKey) {
      return {
        success: false,
        error: 'Image generator API not configured. Please configure at /super-admin/ai-prompts?assistant=image-generator',
      };
    }

    // 2. Get prompt template
    const promptTemplate = await this.getPromptTemplate();
    if (!promptTemplate) {
      this.logger.warn('[ImageGenerator] No prompt template found, using request prompt directly');
    }

    // 3. Build the full prompt
    let fullPrompt = promptTemplate || '';
    
    // Replace {prompt} placeholder if present, otherwise append
    if (fullPrompt.includes('{prompt}')) {
      fullPrompt = fullPrompt.replace('{prompt}', request.prompt);
    } else {
      fullPrompt = fullPrompt ? `${fullPrompt}\n\n${request.prompt}` : request.prompt;
    }

    // Append user input if provided
    if (request.userInput) {
      fullPrompt += `\n\nUser input: ${request.userInput}`;
    }

    // Append custom instructions if provided
    if (request.customInstructions) {
      fullPrompt += `\n\nCustom instructions: ${request.customInstructions}`;
    }

    // 4. Build request payload for Google Gemini API
    // Format: { "contents": [{ "parts": [{ "text": "prompt" }] }] }
    const parts: any[] = [
      {
        text: fullPrompt,
      },
    ];

    // Add screenshot if provided (as inline data)
    if (request.screenshot) {
      // Remove data:image/... prefix if present
      let base64Data = request.screenshot;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      
      // Determine MIME type from screenshot or default to png
      let mimeType = 'image/png';
      if (request.screenshot.startsWith('data:image/')) {
        const mimeMatch = request.screenshot.match(/data:image\/([^;]+)/);
        if (mimeMatch) {
          mimeType = `image/${mimeMatch[1]}`;
        }
      }

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      });
    }

    const requestPayload: any = {
      contents: [
        {
          parts: parts,
        },
      ],
    };

    // Add generation config if specified
    const generationConfig: any = {};
    if (apiConfig.temperature !== undefined) {
      generationConfig.temperature = apiConfig.temperature;
    }
    if (apiConfig.maxTokens) {
      generationConfig.maxOutputTokens = apiConfig.maxTokens;
    }
    if (Object.keys(generationConfig).length > 0) {
      requestPayload.generationConfig = generationConfig;
    }

    // 5. Determine API key header (Gemini uses x-goog-api-key)
    const apiKeyHeader = apiConfig.apiKeyHeader || 'x-goog-api-key';
    const apiKeyValue = apiConfig.apiKey; // Gemini doesn't use Bearer prefix

    // 6. Make API call
    try {
      this.logger.log(`[ImageGenerator] Calling API: ${apiConfig.apiEndpoint}`);
      
      const response = await fetch(apiConfig.apiEndpoint, {
        method: 'POST',
        headers: {
          [apiKeyHeader]: apiKeyValue,
          'Content-Type': 'application/json',
          ...(apiConfig.additionalHeaders || {}), // Allow custom headers
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`[ImageGenerator] API error: ${response.status} ${response.statusText}`);
        this.logger.error(`[ImageGenerator] Error response: ${errorText}`);
        return {
          success: false,
          error: `API error: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();
      this.logger.log('[ImageGenerator] API response received');

      // 7. Parse Gemini API response format:
      // { "candidates": [{ "content": { "parts": [{ "inlineData": { "mimeType": "image/png", "data": "BASE64" } }] } }] }
      
      let imageData: string | undefined;

      try {
        if (data.candidates && data.candidates.length > 0) {
          const candidate = data.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.data) {
                // Convert base64 to data URL
                const mimeType = part.inlineData.mimeType || 'image/png';
                imageData = `data:${mimeType};base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        }

      if (!imageData) {
        this.logger.error('[ImageGenerator] No image found in API response:', JSON.stringify(data).substring(0, 200));
        return {
          success: false,
          error: 'API response did not contain an image in the expected format.',
        };
      }
      } catch (parseError: any) {
        this.logger.error('[ImageGenerator] Error parsing API response:', parseError);
        return {
          success: false,
          error: `Failed to parse API response: ${parseError.message}`,
        };
      }

      // 8. Log LLM usage for tracking and cost calculation
      const processingTimeMs = Date.now() - startTime;
      await this.logUsage({
        userId: userId || 'default-user',
        tenantId: tenantId || 'default-tenant',
        promptText: fullPrompt,
        requestPayload: requestPayload,
        responsePayload: data,
        tokensUsed: this.estimateTokens(fullPrompt, request.screenshot),
        processingTimeMs,
        model: apiConfig.model || 'gemini-2.5-flash-image',
      });

      return {
        success: true,
        imageData, // Gemini returns base64 data, not URLs
        requestId: data.candidates?.[0]?.finishReason || undefined,
      };
    } catch (error: any) {
      this.logger.error('[ImageGenerator] API call failed:', error.message, error.stack);
      return {
        success: false,
        error: `API call failed: ${error.message}`,
      };
    }
  }

  /**
   * Estimate token count for image generation
   * Gemini uses ~1 token per 4 characters for text, plus image tokens
   */
  private estimateTokens(promptText: string, screenshot?: string): number {
    // Text tokens: roughly 1 token per 4 characters
    const textTokens = Math.ceil(promptText.length / 4);
    
    // Image tokens: Gemini charges ~256 tokens per image for input
    const imageTokens = screenshot ? 256 : 0;
    
    // Output image: estimated at ~1024 tokens (standard for image generation)
    const outputTokens = 1024;
    
    return textTokens + imageTokens + outputTokens;
  }

  /**
   * Log LLM usage to database for tracking and cost calculation
   */
  private async logUsage(data: {
    userId: string;
    tenantId: string;
    promptText: string;
    requestPayload: any;
    responsePayload: any;
    tokensUsed: number;
    processingTimeMs: number;
    model: string;
  }): Promise<void> {
    try {
      // Get provider for cost calculation (default to 'gemini' or find by model)
      let provider = await this.llmProviderRepository.findOne({
        where: { isDefault: true },
      });

      // If no default provider, try to find one matching the model
      if (!provider) {
        provider = await this.llmProviderRepository.findOne({
          where: { modelName: data.model },
        });
      }

      const logData: any = {
        userId: data.userId,
        tenantId: data.tenantId,
        assistantId: 'image-generator',
        useCase: 'image-generation',
        promptText: data.promptText.substring(0, 1000), // Truncate if too long
        requestPayload: data.requestPayload,
        response: data.responsePayload,
        tokensUsed: data.tokensUsed,
        processingTimeMs: data.processingTimeMs,
      };
      
      if (provider) {
        logData.providerId = provider.id;
      }
      
      const log = this.llmLogRepository.create(logData);

      await this.llmLogRepository.save(log);
      this.logger.log(
        `[ImageGenerator] Logged ${data.tokensUsed} tokens for user ${data.userId}`,
      );
    } catch (error: any) {
      this.logger.error(`[ImageGenerator] Failed to log LLM usage: ${error.message}`, error.stack);
      // Don't throw - logging failure shouldn't break the request
    }
  }
}

