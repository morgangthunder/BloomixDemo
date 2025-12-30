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
        // Log API key info for debugging (without exposing full key)
        if (config.apiKey) {
          this.logger.log('[ImageGenerator] API config loaded from database:', {
            apiEndpoint: config.apiEndpoint,
            apiKeyLength: config.apiKey.length,
            apiKeyStartsWith: config.apiKey.substring(0, 4),
            apiKeyEndsWith: config.apiKey.substring(config.apiKey.length - 4),
            isMasked: config.apiKey.includes('••••••••'),
            isPlaceholder: config.apiKey === 'your-api-key-here',
            fullApiKeyPreview: config.apiKey.substring(0, 20) + '...' + config.apiKey.substring(config.apiKey.length - 4),
          });
        }
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
    
    // Check if API key is masked or placeholder
    if (apiConfig.apiKey.includes('••••••••') || 
        apiConfig.apiKey === 'your-api-key-here' ||
        apiConfig.apiKey.length < 20) {
      this.logger.error('[ImageGenerator] ❌ API key appears to be masked or invalid:', {
        keyLength: apiConfig.apiKey.length,
        isMasked: apiConfig.apiKey.includes('••••••••'),
        isPlaceholder: apiConfig.apiKey === 'your-api-key-here',
        firstChars: apiConfig.apiKey.substring(0, 10),
        fullKeyPreview: apiConfig.apiKey,
      });
      return {
        success: false,
        error: 'API key appears to be masked or invalid. Please update the API key in /super-admin/ai-prompts?assistant=image-generator with your actual Google API key (not the masked version).',
      };
    }
    
    this.logger.log('[ImageGenerator] ✅ API key validation passed:', {
      keyLength: apiConfig.apiKey.length,
      startsWith: apiConfig.apiKey.substring(0, 4),
      lastChars: apiConfig.apiKey.substring(apiConfig.apiKey.length - 4),
      preview: apiConfig.apiKey.substring(0, 8) + '...' + apiConfig.apiKey.substring(apiConfig.apiKey.length - 4),
    });
    
    this.logger.debug('[ImageGenerator] API key validation passed:', {
      keyLength: apiConfig.apiKey.length,
      startsWith: apiConfig.apiKey.substring(0, 4),
      lastChars: apiConfig.apiKey.substring(apiConfig.apiKey.length - 4),
    });

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

    // 4. Build request payload for Google Gemini API (Nano-Banana is Gemini 2.5 Flash Image)
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

    // 5. Determine API key header (Google Gemini uses x-goog-api-key)
    const apiKeyHeader = apiConfig.apiKeyHeader || 'x-goog-api-key';
    const apiKeyValue = apiConfig.apiKey; // Google API key doesn't use Bearer prefix

    // 6. Make API call
    try {
      const model = apiConfig.model || 'gemini-2.0-flash-exp';
      this.logger.log(`[ImageGenerator] Calling API: ${apiConfig.apiEndpoint} with model: ${model}`);
      this.logger.log(`[ImageGenerator] Using API key header: ${apiKeyHeader}`);
      this.logger.log(`[ImageGenerator] API key value preview: ${apiKeyValue.substring(0, 8)}...${apiKeyValue.substring(apiKeyValue.length - 4)} (length: ${apiKeyValue.length})`);
      this.logger.log(`[ImageGenerator] Full API key being sent: ${apiKeyValue}`);
      this.logger.debug(`[ImageGenerator] Request payload:`, JSON.stringify(requestPayload, null, 2));
      
      const requestHeaders: Record<string, string> = {
        [apiKeyHeader]: apiKeyValue,
        'Content-Type': 'application/json',
        ...(apiConfig.additionalHeaders || {}), // Allow custom headers
      };
      
      this.logger.debug(`[ImageGenerator] Request headers:`, Object.keys(requestHeaders).map(key => 
        key === apiKeyHeader ? `${key}: ${apiKeyValue.substring(0, 10)}...` : `${key}: ${requestHeaders[key]}`
      ));
      
      const response = await fetch(apiConfig.apiEndpoint, {
        method: 'POST',
        headers: requestHeaders,
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
      this.logger.debug('[ImageGenerator] Full API response:', JSON.stringify(data, null, 2));

      // 7. Parse Nano-Banana API response format
      // Possible formats:
      // - { "image": "base64_data" } or { "image_data": "base64_data" }
      // - { "image_url": "https://..." }
      // - { "data": { "image": "base64_data" } }
      
      let imageData: string | undefined;

      try {
        // Check for error in response first
        if (data.error) {
          this.logger.error('[ImageGenerator] API returned error:', JSON.stringify(data.error));
          return {
            success: false,
            error: data.error.message || data.error.error || `API error: ${JSON.stringify(data.error)}`,
          };
        }

        // Try different possible response formats
        // Google Gemini format: data.candidates[0].content.parts[0].inlineData.data
        if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
          const inlineData = data.candidates[0].content.parts[0].inlineData;
          const base64Data = inlineData.data;
          const mimeType = inlineData.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from Gemini candidates[0].content.parts[0].inlineData');
        } else if (data.image) {
          // Direct base64 image data
          const base64Data = data.image;
          const mimeType = data.mime_type || data.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from data.image');
        } else if (data.image_data) {
          // Alternative field name
          const base64Data = data.image_data;
          const mimeType = data.mime_type || data.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from data.image_data');
        } else if (data.image_url || data.imageUrl) {
          // Image URL instead of base64
          const imageUrl = data.image_url || data.imageUrl;
          this.logger.log('[ImageGenerator] ✅ Image URL received:', imageUrl);
          return {
            success: true,
            imageUrl: imageUrl,
            requestId: data.request_id || data.requestId || undefined,
          };
        } else if (data.data?.image) {
          // Nested structure
          const base64Data = data.data.image;
          const mimeType = data.data.mime_type || data.data.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from data.data.image');
        } else if (data.result?.image) {
          // Another possible nested structure
          const base64Data = data.result.image;
          const mimeType = data.result.mime_type || data.result.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from data.result.image');
        }

        if (!imageData && !data.image_url && !data.imageUrl) {
          this.logger.error('[ImageGenerator] No image found in API response');
          this.logger.error('[ImageGenerator] Response keys:', Object.keys(data));
          this.logger.error('[ImageGenerator] Response structure:', JSON.stringify(data).substring(0, 500));
          
          // Log more details about Gemini response structure
          if (data.candidates) {
            this.logger.error('[ImageGenerator] Gemini candidates structure:', {
              candidatesLength: data.candidates.length,
              firstCandidateKeys: data.candidates[0] ? Object.keys(data.candidates[0]) : [],
              hasContent: !!data.candidates[0]?.content,
              hasParts: !!data.candidates[0]?.content?.parts,
              partsLength: data.candidates[0]?.content?.parts?.length,
              firstPartKeys: data.candidates[0]?.content?.parts?.[0] ? Object.keys(data.candidates[0].content.parts[0]) : [],
              hasInlineData: !!data.candidates[0]?.content?.parts?.[0]?.inlineData,
            });
          }
          
          return {
            success: false,
            error: 'API response did not contain an image in the expected format. Expected: candidates[0].content.parts[0].inlineData.data (Gemini), image, image_data, image_url, data.image, or result.image',
          };
        }
      } catch (parseError: any) {
        this.logger.error('[ImageGenerator] Error parsing API response:', parseError);
        this.logger.error('[ImageGenerator] Response data:', JSON.stringify(data).substring(0, 500));
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
        model: apiConfig.model || 'gemini-2.0-flash-exp',
      });

      return {
        success: true,
        imageData, // Gemini returns base64 data
        requestId: data.candidates?.[0]?.finishReason || undefined,
      };
    } catch (error: any) {
      this.logger.error('[ImageGenerator] API call failed:', error.message);
      this.logger.error('[ImageGenerator] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });
      
      // Provide more helpful error messages
      let errorMessage = `API call failed: ${error.message}`;
      if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
        errorMessage = `Failed to connect to API endpoint. Please check:\n1. The endpoint URL is correct: ${apiConfig.apiEndpoint}\n2. Your internet connection\n3. The API service is available`;
      } else if (error.message?.includes('CORS')) {
        errorMessage = `CORS error: The API server may not allow requests from this origin. Check API configuration.`;
      } else if (error.message?.includes('certificate') || error.message?.includes('SSL')) {
        errorMessage = `SSL/TLS error: There may be an issue with the API server's certificate.`;
      }
      
      return {
        success: false,
        error: errorMessage,
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

