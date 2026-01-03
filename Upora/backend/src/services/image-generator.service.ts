import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPrompt } from '../entities/ai-prompt.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { LlmProvider } from '../entities/llm-provider.entity';
import { GeneratedImage } from '../entities/generated-image.entity';
import { FileStorageService } from './file-storage.service';

export interface ImageGenerationRequest {
  prompt: string;
  userInput?: string; // Additional user input to append to prompt
  screenshot?: string; // Optional base64-encoded screenshot
  customInstructions?: string; // Builder-defined custom instructions
  width?: number; // Image width in pixels
  height?: number; // Image height in pixels
  lessonId?: string; // Lesson ID to associate image with
  substageId?: string; // Optional substage ID
  interactionId?: string; // Optional interaction ID
  accountId?: string; // Account ID that created the lesson or is generating the image
}

export interface ImageGenerationResponse {
  imageUrl?: string; // URL to the generated image (persisted in MinIO/S3)
  imageData?: string; // Base64-encoded image data (if returned directly, for immediate display)
  success: boolean;
  error?: string;
  requestId?: string;
  imageId?: string; // ID of the saved image record in database
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
    @InjectRepository(GeneratedImage)
    private generatedImageRepository: Repository<GeneratedImage>,
    private fileStorageService: FileStorageService,
  ) {}

  /**
   * Check if a string is a valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

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

    // Note: Gemini API does NOT support width/height in generationConfig
    // Instead, we add dimension instructions to the prompt if specified
    if (request.width || request.height) {
      const width = request.width || apiConfig.width;
      const height = request.height || apiConfig.height;
      if (width && height) {
        fullPrompt += `\n\nGenerate an image with dimensions ${width}x${height} pixels.`;
      }
    } else if (apiConfig.width || apiConfig.height) {
      const width = apiConfig.width;
      const height = apiConfig.height;
      if (width && height) {
        fullPrompt += `\n\nGenerate an image with dimensions ${width}x${height} pixels.`;
      }
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
    // Note: width/height are already added to the prompt text above, not in generationConfig
    // Gemini API does NOT support width/height in generationConfig
    
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

      let data: any;
      try {
        data = await response.json();
      } catch (jsonError: any) {
        const textResponse = await response.text();
        this.logger.error('[ImageGenerator] Failed to parse JSON response');
        this.logger.error('[ImageGenerator] Response text:', textResponse.substring(0, 500));
        return {
          success: false,
          error: `Failed to parse API response: ${jsonError.message}`,
        };
      }
      
      this.logger.log('[ImageGenerator] API response received');
      this.logger.debug('[ImageGenerator] Response structure:', {
        hasError: !!data.error,
        topLevelKeys: Object.keys(data),
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length,
      });
      
      // Log full response for debugging (truncated)
      if (process.env.LOG_LEVEL === 'debug') {
        this.logger.debug('[ImageGenerator] Full API response:', JSON.stringify(data, null, 2).substring(0, 1000));
      }

      // 7. Parse Google Gemini API response format
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
        // Google Gemini format: data.candidates[0].content.parts[].inlineData.data
        // Note: parts array may contain multiple items (text, image, etc.) - we need to find the one with inlineData
        if (data.candidates?.[0]?.content?.parts) {
          const parts = data.candidates[0].content.parts;
          // Find the part that contains inlineData (image)
          const imagePart = Array.isArray(parts) 
            ? parts.find((part: any) => part.inlineData?.data)
            : null;
          
          if (imagePart?.inlineData?.data) {
            const inlineData = imagePart.inlineData;
            const base64Data = inlineData.data;
            const mimeType = inlineData.mimeType || 'image/png';
            imageData = base64Data.startsWith('data:') 
              ? base64Data 
              : `data:${mimeType};base64,${base64Data}`;
            this.logger.log('[ImageGenerator] ✅ Image extracted from Gemini candidates[0].content.parts[].inlineData');
          }
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
          if (data.candidates && Array.isArray(data.candidates)) {
            const parts = data.candidates[0]?.content?.parts;
            const partsArray = Array.isArray(parts) ? parts : [];
            
            this.logger.error('[ImageGenerator] Gemini candidates structure:', {
              candidatesLength: data.candidates.length,
              firstCandidateKeys: data.candidates[0] ? Object.keys(data.candidates[0]) : [],
              hasContent: !!data.candidates[0]?.content,
              contentKeys: data.candidates[0]?.content ? Object.keys(data.candidates[0].content) : [],
              hasParts: !!parts,
              partsLength: partsArray.length,
              partsTypes: partsArray.map((p: any, i: number) => ({
                index: i,
                keys: Object.keys(p),
                hasText: !!p.text,
                hasInlineData: !!p.inlineData,
              })),
            });
            
            // Log each part structure
            partsArray.forEach((part: any, index: number) => {
              this.logger.error(`[ImageGenerator] Part ${index} structure:`, JSON.stringify(part, null, 2).substring(0, 300));
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

      // 9. Save image to MinIO/S3 if lessonId and accountId are provided
      let savedImageUrl: string | undefined;
      let savedImageId: string | undefined;
      this.logger.log(`[ImageGenerator] Checking save conditions - imageData: ${!!imageData}, lessonId: ${request.lessonId}, accountId: ${request.accountId}`);
      if (imageData && request.lessonId && request.accountId) {
        try {
          // Extract base64 data and mime type
          let base64Data = imageData;
          let mimeType = 'image/png';
          
          if (imageData.startsWith('data:')) {
            const mimeMatch = imageData.match(/data:([^;]+)/);
            if (mimeMatch) {
              mimeType = mimeMatch[1];
            }
            base64Data = imageData.split(',')[1];
          }

          // Convert base64 to buffer
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Determine file extension from mime type
          const extension = mimeType === 'image/jpeg' ? '.jpg' : 
                           mimeType === 'image/png' ? '.png' : 
                           mimeType === 'image/gif' ? '.gif' : '.png';
          
          // Save to MinIO/S3 in account-specific folder
          const subfolder = `images/${request.accountId}`;
          const savedFile = await this.fileStorageService.saveFile({
            buffer: imageBuffer,
            originalname: `generated-${Date.now()}${extension}`,
            mimetype: mimeType,
          }, subfolder);
          
          // Generate signed URL for access (valid for 7 days)
          // This allows browser to access the image from MinIO/S3
          let publicImageUrl = savedFile.url;
          try {
            const signedUrl = await this.fileStorageService.getSignedUrl(savedFile.url, 7 * 24 * 60 * 60); // 7 days
            if (signedUrl) {
              publicImageUrl = signedUrl;
              this.logger.log(`[ImageGenerator] Generated signed URL for image: ${signedUrl.substring(0, 100)}...`);
            }
          } catch (signedUrlError: any) {
            this.logger.warn(`[ImageGenerator] Failed to generate signed URL, using direct URL: ${signedUrlError.message}`);
          }
          
          savedImageUrl = publicImageUrl;
          
          // Store metadata in database (store the original URL, not the signed URL)
          const generatedImage = this.generatedImageRepository.create({
            lessonId: request.lessonId,
            accountId: request.accountId,
            imageUrl: savedFile.url, // Store original URL, we'll generate signed URLs when retrieving
            mimeType: mimeType,
            width: request.width || null,
            height: request.height || null,
            prompt: fullPrompt,
            substageId: request.substageId && this.isValidUUID(request.substageId) ? request.substageId : null,
            interactionId: request.interactionId && this.isValidUUID(request.interactionId) ? request.interactionId : null,
            metadata: {
              model: apiConfig.model || 'gemini-2.0-flash-exp',
              processingTimeMs,
              tokensUsed: this.estimateTokens(fullPrompt, request.screenshot),
              originalPrompt: request.prompt, // Store the original user prompt
            },
          });
          
          const savedImage = await this.generatedImageRepository.save(generatedImage);
          
          savedImageId = savedImage.id;
          this.logger.log(`[ImageGenerator] ✅ Image saved to storage: ${savedImageUrl} (ID: ${savedImage.id})`);
        } catch (saveError: any) {
          this.logger.error(`[ImageGenerator] Failed to save image to storage: ${saveError.message}`);
          // Continue and return imageData even if save fails
        }
      }

      // Return result with imageId if available (even if save failed)
      const result: any = {
        success: true,
        imageData, // Gemini returns base64 data (always return for immediate display)
      };
      
      if (savedImageUrl) {
        result.imageUrl = savedImageUrl;
      }
      
      if (savedImageId) {
        result.imageId = savedImageId;
        this.logger.log(`[ImageGenerator] ✅ Returning imageId: ${savedImageId}`);
      } else {
        this.logger.warn(`[ImageGenerator] ⚠️ No imageId to return. lessonId: ${request.lessonId}, accountId: ${request.accountId}`);
      }
      
      if (data.candidates?.[0]?.finishReason) {
        result.requestId = data.candidates[0].finishReason;
      }
      
      return result;
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

  /**
   * Get all images generated for a lesson
   * Returns images with signed URLs for browser access
   */
  async getLessonImages(lessonId: string, accountId?: string): Promise<any[]> {
    try {
      this.logger.log(`[ImageGenerator] Getting images for lesson: ${lessonId}, accountId: ${accountId || 'all'}`);
      
      // Use find() instead of query builder for simpler queries
      const whereClause: any = { lessonId };
      if (accountId) {
        whereClause.accountId = accountId;
      }
      
      const images = await this.generatedImageRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
      });
      
      this.logger.log(`[ImageGenerator] Found ${images.length} images for lesson ${lessonId}`);
      
      if (images.length === 0) {
        this.logger.log(`[ImageGenerator] No images found for lesson ${lessonId}`);
        return [];
      }
      
      // Generate signed URLs for each image
      const imagesWithSignedUrls = await Promise.all(
        images.map(async (image) => {
          let publicImageUrl = image.imageUrl;
          try {
            // Generate signed URL valid for 7 days (only for S3/MinIO, returns null for local storage)
            const signedUrl = await this.fileStorageService.getSignedUrl(image.imageUrl, 7 * 24 * 60 * 60);
            if (signedUrl) {
              publicImageUrl = signedUrl;
              this.logger.debug(`[ImageGenerator] Generated signed URL for image ${image.id}`);
            } else {
              // Local storage - use the original URL
              this.logger.debug(`[ImageGenerator] Using original URL for image ${image.id} (local storage)`);
            }
          } catch (error: any) {
            this.logger.warn(`[ImageGenerator] Failed to generate signed URL for image ${image.id}: ${error.message}`);
            // Continue with original URL if signed URL generation fails
          }
          
          return {
            id: image.id,
            lessonId: image.lessonId,
            accountId: image.accountId,
            imageUrl: publicImageUrl, // Return signed URL (or original URL for local storage)
            mimeType: image.mimeType,
            width: image.width,
            height: image.height,
            prompt: image.prompt,
            substageId: image.substageId,
            interactionId: image.interactionId,
            metadata: image.metadata,
            createdAt: image.createdAt,
            updatedAt: image.updatedAt,
          };
        })
      );
      
      this.logger.log(`[ImageGenerator] ✅ Returning ${imagesWithSignedUrls.length} images with signed URLs`);
      return imagesWithSignedUrls;
    } catch (error: any) {
      this.logger.error(`[ImageGenerator] ❌ Error getting lesson images: ${error.message}`);
      this.logger.error(`[ImageGenerator] Error stack: ${error.stack}`);
      if (error.response) {
        this.logger.error(`[ImageGenerator] Error response:`, error.response);
      }
      if (error.query) {
        this.logger.error(`[ImageGenerator] Failed query:`, error.query);
      }
      throw error; // Re-throw to let NestJS handle the 500 response
    }
  }

  /**
   * Get a single image by ID
   */
  async getImageById(imageId: string): Promise<any> {
    try {
      this.logger.log(`[ImageGenerator] Getting image by ID: ${imageId}`);
      
      const image = await this.generatedImageRepository.findOne({ where: { id: imageId } });
      
      if (!image) {
        this.logger.log(`[ImageGenerator] Image not found: ${imageId}`);
        return null;
      }

      // Generate signed URL if needed
      let publicImageUrl = image.imageUrl;
      try {
        const signedUrl = await this.fileStorageService.getSignedUrl(image.imageUrl, 7 * 24 * 60 * 60);
        if (signedUrl) {
          publicImageUrl = signedUrl;
        }
      } catch (error: any) {
        this.logger.warn(`[ImageGenerator] Failed to generate signed URL for image ${image.id}: ${error.message}`);
      }

      return {
        id: image.id,
        lessonId: image.lessonId,
        accountId: image.accountId,
        imageUrl: publicImageUrl,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        prompt: image.prompt,
        substageId: image.substageId,
        interactionId: image.interactionId,
        metadata: image.metadata,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
      };
    } catch (error: any) {
      this.logger.error(`[ImageGenerator] ❌ Error getting image by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get only image IDs for a lesson (for listing purposes)
   */
  async getLessonImageIds(lessonId: string, accountId?: string): Promise<string[]> {
    try {
      this.logger.log(`[ImageGenerator] Getting image IDs for lesson: ${lessonId}, accountId: ${accountId || 'all'}`);
      
      const whereClause: any = { lessonId };
      if (accountId) {
        whereClause.accountId = accountId;
      }
      
      const images = await this.generatedImageRepository.find({
        where: whereClause,
        select: ['id'],
        order: { createdAt: 'DESC' },
      });
      
      const imageIds = images.map(img => img.id);
      this.logger.log(`[ImageGenerator] ✅ Returning ${imageIds.length} image IDs`);
      return imageIds;
    } catch (error: any) {
      this.logger.error(`[ImageGenerator] ❌ Error getting lesson image IDs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an image by ID
   * Also deletes the image file from storage
   */
  async deleteImage(imageId: string, userId?: string, tenantId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log(`[ImageGenerator] Deleting image: ${imageId}`);
      
      // Find the image first
      const image = await this.generatedImageRepository.findOne({ where: { id: imageId } });
      
      if (!image) {
        this.logger.warn(`[ImageGenerator] Image not found: ${imageId}`);
        return { success: false, error: 'Image not found' };
      }

      // Delete the image file from storage
      try {
        await this.fileStorageService.deleteFile(image.imageUrl);
        this.logger.log(`[ImageGenerator] ✅ Deleted image file from storage: ${image.imageUrl}`);
      } catch (error: any) {
        this.logger.warn(`[ImageGenerator] Failed to delete image file from storage: ${error.message}`);
        // Continue with database deletion even if file deletion fails
      }

      // Delete the database record
      await this.generatedImageRepository.remove(image);
      this.logger.log(`[ImageGenerator] ✅ Deleted image record from database: ${imageId}`);
      
      return { success: true };
    } catch (error: any) {
      this.logger.error(`[ImageGenerator] ❌ Error deleting image: ${error.message}`);
      this.logger.error(`[ImageGenerator] Error stack: ${error.stack}`);
      return { success: false, error: error.message };
    }
  }
}

