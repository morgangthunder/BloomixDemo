import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPrompt } from '../entities/ai-prompt.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { LlmProvider } from '../entities/llm-provider.entity';
import { GeneratedImage } from '../entities/generated-image.entity';
import { FileStorageService } from './file-storage.service';
import { UsersService } from '../modules/users/users.service';
import { ContentCacheService } from './content-cache.service';

export interface ImageGenerationRequest {
  prompt: string;
  userInput?: string;
  screenshot?: string;
  customInstructions?: string;
  width?: number;
  height?: number;
  lessonId?: string;
  substageId?: string;
  interactionId?: string;
  accountId?: string;
  /** When true, a follow-up LLM call labels objects with bounding-box coordinates */
  includeComponentMap?: boolean;
  /** Optional hint about component types to detect (e.g. "buttons,labels,icons") */
  componentPromptContent?: string;
  /** Tag the resulting image with these dictionary labels for cross-interaction reuse */
  dictionaryLabels?: string[];
  /** Skip cache lookup and force a fresh generation */
  skipCache?: boolean;
  /** When true, also generate a mobile-optimised variant (portrait) alongside the desktop image */
  dualViewport?: boolean;
  /** Override mobile dimensions (default: 720x1280 i.e. 9:16) */
  mobileWidth?: number;
  mobileHeight?: number;
  /** When true, skip the text-detection fallback to cached images on the final attempt */
  testMode?: boolean;
}

export interface ImageGenerationResponse {
  imageUrl?: string;
  imageData?: string;
  success: boolean;
  error?: string;
  requestId?: string;
  imageId?: string;
  /** True when the result came from cache instead of a fresh generation */
  cached?: boolean;
  /** Component map with labelled bounding boxes (when includeComponentMap was true) */
  componentMap?: Record<string, any>;
  /** Mobile-optimised variant (when dualViewport was true) */
  mobileVariant?: {
    imageUrl?: string;
    imageId?: string;
    componentMap?: Record<string, any>;
  };
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
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private contentCacheService: ContentCacheService,
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

    // ── 0. Cache lookup ──────────────────────────────────────────
    // Build personalisation tags for this user (used in hash and stored with result)
    const personalisationTags = userId
      ? await this.contentCacheService.getPersonalisationTags(userId)
      : [];

    // Check dictionary first for simple single-word prompts (no userInput, no customInstructions)
    if (!request.skipCache && !request.userInput && !request.customInstructions && !request.screenshot) {
      const words = request.prompt.trim().split(/\s+/);
      if (words.length <= 2) {
        const dictHit = await this.contentCacheService.findImageByDictionaryLabel(request.prompt.trim());
        if (dictHit) {
          this.logger.log(`[ImageGenerator] DICTIONARY CACHE HIT for "${request.prompt.trim()}" → ${dictHit.id}`);
          const signedUrl = await this.getSignedUrlSafe(dictHit.imageUrl);
          return {
            success: true,
            imageUrl: signedUrl,
            imageId: dictHit.id,
            cached: true,
            componentMap: dictHit.componentMap || undefined,
          };
        }
      }
    }

    // Compute param hash for full cache lookup
    const paramHash = this.contentCacheService.computeImageHash({
      prompt: request.prompt,
      userInput: request.userInput,
      customInstructions: request.customInstructions,
      width: request.width,
      height: request.height,
      personalisationTags,
    });

    if (!request.skipCache) {
      const cached = await this.contentCacheService.findCachedImage(paramHash);
      if (cached) {
        this.logger.log(`[ImageGenerator] CACHE HIT → ${cached.id} (hash ${paramHash.substring(0, 12)}…)`);
        const signedUrl = await this.getSignedUrlSafe(cached.imageUrl);

        // If component map was requested but the cached image doesn't have one yet, generate it
        if (request.includeComponentMap && !cached.componentMap) {
          const componentMap = await this.generateComponentMap(cached, request.componentPromptContent);
          if (componentMap) {
            cached.componentMap = componentMap;
            await this.generatedImageRepository.update(cached.id, { componentMap });
          }
        }

        return {
          success: true,
          imageUrl: signedUrl,
          imageId: cached.id,
          cached: true,
          componentMap: cached.componentMap || undefined,
        };
      }
    }

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

    // Wrap the prompt with game context: WHY no text, and WHY no margins.
    const prefixEnforcement = 'This artwork is for a visual matching game — any text in the image gives away answers and breaks the game. ' +
      'The image must contain only painted imagery with zero text of any kind. ' +
      'The game runs on screens with very limited space, so the artwork MUST fill the entire canvas edge-to-edge — ' +
      'any margin, padding, border, or blank space wastes precious screen area and damages the player experience.';
    const suffixEnforcement = 'Remember: (1) This is for a game — text gives away answers and ruins it. ' +
      '(2) Screen space is limited — margins/padding/borders waste it. The artwork must touch all four edges.';
    fullPrompt = prefixEnforcement + '\n\n' + fullPrompt + '\n\n' + suffixEnforcement;

    // Determine aspect ratio for imageConfig (Gemini API proper parameter).
    // Supported: "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
    let requestedAspectRatio: string | null = null;
    const w = request.width || apiConfig.width;
    const h = request.height || apiConfig.height;
    if (w && h) {
      const supported = [
        { r: '21:9', v: 21/9 }, { r: '16:9', v: 16/9 }, { r: '3:2', v: 3/2 },
        { r: '5:4', v: 5/4 },  { r: '4:3', v: 4/3 },   { r: '1:1', v: 1 },
        { r: '4:5', v: 4/5 },  { r: '3:4', v: 3/4 },   { r: '2:3', v: 2/3 },
        { r: '9:16', v: 9/16 },
      ];
      const actual = w / h;
      let best = supported[0];
      let bestDiff = Math.abs(actual - best.v);
      for (const s of supported) {
        const diff = Math.abs(actual - s.v);
        if (diff < bestDiff) { best = s; bestDiff = diff; }
      }
      requestedAspectRatio = best.r;
      this.logger.log(`[ImageGenerator] Requested ${w}x${h} → mapped to aspect ratio ${requestedAspectRatio}`);
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

    // Add generation config - MUST include responseModalities for image generation
    const generationConfig: any = {
      responseModalities: ['TEXT', 'IMAGE'],
    };
    if (apiConfig.temperature !== undefined) {
      generationConfig.temperature = apiConfig.temperature;
    }
    if (apiConfig.maxTokens) {
      generationConfig.maxOutputTokens = apiConfig.maxTokens;
    }
    // Use imageConfig.aspectRatio — the proper Gemini API parameter for controlling output dimensions
    if (requestedAspectRatio) {
      generationConfig.imageConfig = { aspectRatio: requestedAspectRatio };
      this.logger.log(`[ImageGenerator] Set generationConfig.imageConfig.aspectRatio = "${requestedAspectRatio}"`);
    }
    
    requestPayload.generationConfig = generationConfig;

    // System instruction: the model respects this at a higher level than prompt text.
    // Uses semantic negative prompting — positive description of desired output.
    requestPayload.systemInstruction = {
      parts: [{
        text: 'You are creating artwork for a visual matching game. Two rules are critical and breaking either one ruins the game:\n' +
          '1. NO TEXT: Players must identify concepts by visual appearance alone — any text, label, caption, number, or written character gives away answers and breaks the game.\n' +
          '2. NO MARGINS: The game runs on screens with very limited space. Any margin, padding, border, or blank space around the artwork wastes precious screen area and damages the experience. The artwork MUST fill the entire canvas edge-to-edge (full bleed), touching all four sides.\n' +
          'Every image you produce contains only painted imagery — objects, colours, actions, scenery — with zero text and zero margins.'
      }]
    };

    // Add safety settings to reduce false-positive content blocks
    // (finishReason=OTHER often comes from overly strict default filters)
    requestPayload.safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ];

    // 5. Determine API key header (Google Gemini uses x-goog-api-key)
    const apiKeyHeader = apiConfig.apiKeyHeader || 'x-goog-api-key';
    const apiKeyValue = apiConfig.apiKey; // Google API key doesn't use Bearer prefix

    // 6. Make API call with retry logic for finishReason=OTHER
    const MAX_RETRIES = 3;
    let lastFinishReason = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const model = apiConfig.model || 'gemini-2.0-flash-exp';
      this.logger.log(`[ImageGenerator] Attempt ${attempt}/${MAX_RETRIES}: Calling ${apiConfig.apiEndpoint} (model: ${model})`);
      if (attempt === 1) {
        this.logger.log(`[ImageGenerator] Using API key header: ${apiKeyHeader}`);
        this.logger.log(`[ImageGenerator] API key preview: ${apiKeyValue.substring(0, 8)}...${apiKeyValue.substring(apiKeyValue.length - 4)} (length: ${apiKeyValue.length})`);
        this.logger.log(`[ImageGenerator] generationConfig: ${JSON.stringify(requestPayload.generationConfig)}`);
        this.logger.log(`[ImageGenerator] Prompt preview (first 200 chars): ${request.prompt.substring(0, 200)}`);
      }
      this.logger.debug(`[ImageGenerator] Request payload:`, JSON.stringify(requestPayload, null, 2));
      
      const requestHeaders: Record<string, string> = {
        [apiKeyHeader]: apiKeyValue,
        'Content-Type': 'application/json',
        ...(apiConfig.additionalHeaders || {}), // Allow custom headers
      };
      
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
        this.logger.error('[ImageGenerator] Failed to parse JSON response');
        return {
          success: false,
          error: `Failed to parse API response: ${jsonError.message}`,
        };
      }
      
      const apiDurationMs = Date.now() - startTime;
      this.logger.log(`[ImageGenerator] API response received in ${apiDurationMs}ms`);
      this.logger.log('[ImageGenerator] Response structure:', {
        hasError: !!data.error,
        topLevelKeys: Object.keys(data),
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length,
        modelVersion: data.modelVersion,
        finishReason: data.candidates?.[0]?.finishReason,
        hasContent: !!data.candidates?.[0]?.content,
      });
      
      // Log full response for debugging (truncated)
      this.logger.log('[ImageGenerator] Full API response (truncated):', JSON.stringify(data, null, 2).substring(0, 1500));

      // 7. Parse Google Gemini API response format
      let imageData: string | undefined;

      try {
        // Check for error in response first
        if (data.error) {
          this.logger.error('[ImageGenerator] ❌ API returned error:', JSON.stringify(data.error));
          return {
            success: false,
            error: data.error.message || data.error.error || `API error: ${JSON.stringify(data.error)}`,
          };
        }

        // Check for Gemini finishReason issues BEFORE trying to extract image
        const candidate = data.candidates?.[0];
        if (candidate && !candidate.content) {
          const finishReason = candidate.finishReason || 'UNKNOWN';
          lastFinishReason = finishReason;
          const safetyRatings = candidate.safetyRatings ? JSON.stringify(candidate.safetyRatings) : 'none';
          
          this.logger.warn(`[ImageGenerator] ⚠️ Attempt ${attempt}/${MAX_RETRIES}: Gemini returned no content. finishReason="${finishReason}"`);
          this.logger.warn(`[ImageGenerator] Safety ratings: ${safetyRatings}`);
          this.logger.warn(`[ImageGenerator] Full candidate: ${JSON.stringify(candidate)}`);
          
          // For finishReason=OTHER, retry (known intermittent issue with Gemini image models)
          if (finishReason === 'OTHER' && attempt < MAX_RETRIES) {
            const delayMs = attempt * 2000; // 2s, 4s backoff
            this.logger.log(`[ImageGenerator] Retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue; // retry the loop
          }
          
          // All retries exhausted or non-retryable reason
          const finishReasonMessages: Record<string, string> = {
            'OTHER': `The model failed to generate an image after ${attempt} attempt(s) (finishReason=OTHER). This is a known intermittent issue with Gemini image models. The prompt may also reference copyrighted content that triggers content filters. Try again, or use a different theme/style.`,
            'SAFETY': 'The image generation was blocked by safety filters. Try a different prompt that avoids potentially sensitive content.',
            'RECITATION': 'The image generation was blocked due to recitation/copyright concerns. Try a more original or abstract prompt.',
            'MAX_TOKENS': 'The response was cut off due to token limits. Try a shorter/simpler prompt.',
            'STOP': 'The model stopped without producing an image. It may have returned text instead.',
          };
          
          const userMessage = finishReasonMessages[finishReason] 
            || `Image generation failed (finishReason=${finishReason}). The Gemini model did not produce an image. Try simplifying or rephrasing the prompt.`;
          
          // Auto-report the movie/TV reference as troublesome
          if (request.userInput) {
            this.addTroublesomeReference(request.userInput, `finishReason=${finishReason} after ${attempt} attempt(s)`).catch(() => {});
            this.logger.warn(`[ImageGenerator] Auto-reported troublesome reference: "${request.userInput}"`);
          }

          return {
            success: false,
            error: userMessage,
          };
        }

        // Try different possible response formats
        // Google Gemini format: data.candidates[0].content.parts[].inlineData.data
        if (data.candidates?.[0]?.content?.parts) {
          const parts = data.candidates[0].content.parts;
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
            this.logger.log(`[ImageGenerator] ✅ Image extracted from Gemini parts[].inlineData (${mimeType}, ~${Math.round(base64Data.length / 1024)}KB base64)`);
          } else {
            // Content exists but no image part found - log what parts we got
            const partsArray = Array.isArray(parts) ? parts : [];
            this.logger.warn(`[ImageGenerator] ⚠️ Gemini returned ${partsArray.length} parts but none contain inlineData:`, 
              partsArray.map((p: any, i: number) => ({
                index: i,
                keys: Object.keys(p),
                hasText: !!p.text,
                textPreview: p.text ? p.text.substring(0, 200) : undefined,
                hasInlineData: !!p.inlineData,
              }))
            );
          }
        } else if (data.image) {
          const base64Data = data.image;
          const mimeType = data.mime_type || data.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from data.image');
        } else if (data.image_data) {
          const base64Data = data.image_data;
          const mimeType = data.mime_type || data.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from data.image_data');
        } else if (data.image_url || data.imageUrl) {
          const imageUrl = data.image_url || data.imageUrl;
          this.logger.log('[ImageGenerator] ✅ Image URL received:', imageUrl);
          return {
            success: true,
            imageUrl: imageUrl,
            requestId: data.request_id || data.requestId || undefined,
          };
        } else if (data.data?.image) {
          const base64Data = data.data.image;
          const mimeType = data.data.mime_type || data.data.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from data.data.image');
        } else if (data.result?.image) {
          const base64Data = data.result.image;
          const mimeType = data.result.mime_type || data.result.mimeType || 'image/png';
          imageData = base64Data.startsWith('data:') 
            ? base64Data 
            : `data:${mimeType};base64,${base64Data}`;
          this.logger.log('[ImageGenerator] ✅ Image extracted from data.result.image');
        }

        if (!imageData && !data.image_url && !data.imageUrl) {
          this.logger.error('[ImageGenerator] ❌ No image found in API response');
          this.logger.error('[ImageGenerator] Response keys:', Object.keys(data));
          this.logger.error('[ImageGenerator] Response (truncated):', JSON.stringify(data).substring(0, 800));
          
          if (data.candidates && Array.isArray(data.candidates)) {
            const parts = data.candidates[0]?.content?.parts;
            const partsArray = Array.isArray(parts) ? parts : [];
            
            this.logger.error('[ImageGenerator] Gemini candidates detail:', {
              candidatesLength: data.candidates.length,
              firstCandidateKeys: data.candidates[0] ? Object.keys(data.candidates[0]) : [],
              finishReason: data.candidates[0]?.finishReason,
              hasContent: !!data.candidates[0]?.content,
              contentKeys: data.candidates[0]?.content ? Object.keys(data.candidates[0].content) : [],
              partsCount: partsArray.length,
              partsTypes: partsArray.map((p: any, i: number) => ({
                index: i,
                keys: Object.keys(p),
                hasText: !!p.text,
                hasInlineData: !!p.inlineData,
              })),
            });
          }
          
          return {
            success: false,
            error: 'The Gemini API returned a response but no image was found. The model may have returned only text. Check backend logs for full response details.',
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

      // 7b. Text detection — retry on text for attempts 1–2; on final attempt fall back to cached image
      if (imageData) {
        try {
          let rawBase64 = imageData;
          let detectedMime = 'image/png';
          if (rawBase64.startsWith('data:')) {
            const mimeMatch = rawBase64.match(/data:([^;]+)/);
            if (mimeMatch) detectedMime = mimeMatch[1];
            rawBase64 = rawBase64.split(',')[1];
          }
          const hasText = await this.detectTextInImage(rawBase64, detectedMime);
          if (hasText) {
            if (attempt < MAX_RETRIES) {
              this.logger.warn(`[ImageGenerator] ⚠️ Text detected in generated image (attempt ${attempt}/${MAX_RETRIES}). Regenerating...`);
              imageData = undefined;
              const delayMs = attempt * 1500;
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            }

            // Final attempt — fall back to a cached text-free image (non-test mode only)
            if (!request.testMode) {
              this.logger.warn(`[ImageGenerator] ⚠️ Text detected on final attempt ${attempt}/${MAX_RETRIES}. Searching for cached text-free fallback...`);
              const fallback = await this.findTextFreeFallback(request, personalisationTags);
              if (fallback) {
                this.logger.log(`[ImageGenerator] ✅ Using cached text-free fallback image: ${fallback.id} (userInput: ${fallback.userInput})`);
                const signedUrl = await this.getSignedUrlSafe(fallback.imageUrl);

                if (request.includeComponentMap && !fallback.componentMap) {
                  const cm = await this.generateComponentMap(fallback, request.componentPromptContent);
                  if (cm) {
                    fallback.componentMap = cm;
                    await this.generatedImageRepository.update(fallback.id, { componentMap: cm });
                  }
                }

                const fallbackResult: any = {
                  success: true,
                  imageUrl: signedUrl,
                  imageId: fallback.id,
                  cached: true,
                  componentMap: fallback.componentMap || undefined,
                };

                if (request.dualViewport && fallback.pairedImageId) {
                  const mobileImg = await this.generatedImageRepository.findOne({ where: { id: fallback.pairedImageId } });
                  if (mobileImg) {
                    const mobileUrl = await this.getSignedUrlSafe(mobileImg.imageUrl);
                    fallbackResult.mobileVariant = {
                      imageUrl: mobileUrl,
                      imageId: mobileImg.id,
                      componentMap: mobileImg.componentMap,
                    };
                  }
                }

                return fallbackResult;
              }
              this.logger.warn(`[ImageGenerator] No cached text-free fallback available. Accepting text-containing image as last resort.`);
            } else {
              this.logger.warn(`[ImageGenerator] ⚠️ Text detected on final attempt (test mode) — accepting as-is.`);
            }
          } else {
            this.logger.log(`[ImageGenerator] ✅ Text detection passed — image is text-free (attempt ${attempt})`);
          }
        } catch (detectErr: any) {
          this.logger.warn(`[ImageGenerator] Text detection check failed, proceeding: ${detectErr.message}`);
        }
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
          
          // Detect actual pixel dimensions from image header
          let actualWidth = 0, actualHeight = 0;
          try {
            if (mimeType === 'image/png' && imageBuffer.length > 24) {
              actualWidth = imageBuffer.readUInt32BE(16);
              actualHeight = imageBuffer.readUInt32BE(20);
            } else if (mimeType === 'image/jpeg' && imageBuffer.length > 4) {
              let offset = 2;
              while (offset < imageBuffer.length - 1) {
                if (imageBuffer[offset] !== 0xFF) break;
                const marker = imageBuffer[offset + 1];
                if (marker === 0xC0 || marker === 0xC2) {
                  actualHeight = imageBuffer.readUInt16BE(offset + 5);
                  actualWidth = imageBuffer.readUInt16BE(offset + 7);
                  break;
                }
                const segLen = imageBuffer.readUInt16BE(offset + 2);
                offset += 2 + segLen;
              }
            }
            if (actualWidth > 0 && actualHeight > 0) {
              const ratio = (actualWidth / actualHeight).toFixed(3);
              this.logger.log(`[ImageGenerator] Actual image dimensions: ${actualWidth}x${actualHeight} (ratio: ${ratio}, requested: ${requestedAspectRatio || 'none'})`);
            }
          } catch (dimErr: any) {
            this.logger.warn(`[ImageGenerator] Could not detect image dimensions: ${dimErr.message}`);
          }

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
          
          // Normalise dictionary labels
          const normDictLabels = (request.dictionaryLabels || [])
            .map(l => l.trim().toLowerCase().replace(/\s+/g, '-'))
            .filter(l => l.length > 0);
          // For short prompts (1-2 words), auto-add the prompt as a dictionary label
          const promptWords = request.prompt.trim().split(/\s+/);
          if (promptWords.length <= 2) {
            const autoLabel = request.prompt.trim().toLowerCase().replace(/\s+/g, '-');
            if (!normDictLabels.includes(autoLabel)) normDictLabels.push(autoLabel);
          }

          // Store metadata in database with cache fields
          const generatedImage = this.generatedImageRepository.create({
            lessonId: request.lessonId,
            accountId: request.accountId,
            imageUrl: savedFile.url,
            mimeType: mimeType,
            width: actualWidth || request.width || null,
            height: actualHeight || request.height || null,
            prompt: fullPrompt,
            substageId: request.substageId && this.isValidUUID(request.substageId) ? request.substageId : null,
            interactionId: request.interactionId && this.isValidUUID(request.interactionId) ? request.interactionId : null,
            paramHash,
            personalisationTags: personalisationTags.length > 0 ? personalisationTags : null,
            dictionaryLabels: normDictLabels.length > 0 ? normDictLabels : null,
            userInput: request.userInput || null,
            metadata: {
              model: apiConfig.model || 'gemini-2.0-flash-exp',
              processingTimeMs,
              tokensUsed: this.estimateTokens(fullPrompt, request.screenshot),
              originalPrompt: request.prompt,
            },
          });
          
          const savedImage = await this.generatedImageRepository.save(generatedImage);
          
          savedImageId = savedImage.id;

          // Generate component map if requested
          if (request.includeComponentMap) {
            const componentMap = await this.generateComponentMap(savedImage, request.componentPromptContent);
            if (componentMap) {
              savedImage.componentMap = componentMap;
              await this.generatedImageRepository.update(savedImage.id, { componentMap });
            }
          }
          this.logger.log(`[ImageGenerator] ✅ Image saved to storage: ${savedImageUrl} (ID: ${savedImage.id})`);
        } catch (saveError: any) {
          this.logger.error(`[ImageGenerator] Failed to save image to storage: ${saveError.message}`);
          // Continue and return imageData even if save fails
        }
      }

      // Return result with imageId if available (even if save failed)
      const result: any = {
        success: true,
        imageData,
        cached: false,
      };
      
      if (savedImageUrl) {
        result.imageUrl = savedImageUrl;
      }
      
      if (savedImageId) {
        result.imageId = savedImageId;
        this.logger.log(`[ImageGenerator] ✅ Returning imageId: ${savedImageId}`);
        // Attach component map if it was generated
        const img = await this.generatedImageRepository.findOne({ where: { id: savedImageId } });
        if (img?.componentMap) result.componentMap = img.componentMap;
      } else {
        this.logger.warn(`[ImageGenerator] ⚠️ No imageId to return. lessonId: ${request.lessonId}, accountId: ${request.accountId}`);
      }
      
      if (data.candidates?.[0]?.finishReason) {
        result.requestId = data.candidates[0].finishReason;
      }

      // ── Dual-viewport: generate mobile variant and link as pair ──
      if (request.dualViewport && result.success) {
        const mobileW = request.mobileWidth || 720;
        const mobileH = request.mobileHeight || 1280;
        this.logger.log(`[ImageGenerator] Dual-viewport: generating mobile variant ${mobileW}x${mobileH}`);
        try {
          let mobilePrompt = request.prompt;
          const isSceneImage = (request.customInstructions || '').toLowerCase().includes('single scene');

          if (isSceneImage) {
            mobilePrompt = mobilePrompt.replace(/wide landscape/gi, 'tall portrait');
          } else {
            mobilePrompt = mobilePrompt.replace(/wide landscape/gi, 'tall portrait');
            mobilePrompt = mobilePrompt.replace(/arranged left-to-right/gi, 'arranged in a 2-column grid from top to bottom');
            mobilePrompt = mobilePrompt.replace(/left-to-right/gi, 'top-to-bottom');
            mobilePrompt = mobilePrompt.replace(/left to right/gi, 'top to bottom');
            mobilePrompt = mobilePrompt.replace(/single row left-to-right/gi, 'single column top-to-bottom');
            mobilePrompt = mobilePrompt.replace(/TWO rows/gi, 'TWO columns');
          }

          // The mobile prompt already contains the game-context prefix from the
          // desktop prompt (via request.prompt). No need to replace it — just ensure
          // it's present. The systemInstruction (game context) also applies to this call.

          let mobileCustom = (request.customInstructions || '') +
            ' This image is for a MOBILE PHONE screen in portrait (9:16) orientation.' +
            ' The screen is very small so every pixel matters — the artwork MUST fill the entire canvas edge-to-edge with zero padding, zero margins, zero borders.' +
            ' Any margin or blank space wastes precious screen real-estate and damages the player experience on mobile.' +
            ' Scenes sit directly adjacent with artwork touching on all sides.' +
            ' If any background is needed, it must be very dark (#0f0f23 or near-black) to blend with a dark UI.';

          if (isSceneImage) {
            mobileCustom += ' This is a single cohesive scene (NOT a grid). All items must be clearly visible in portrait orientation.';
          } else {
            mobileCustom += ' Arrange content in TWO COLUMNS side by side, filling the full width.' +
              ' NEVER add empty padding or blank space on ANY side — prefer using 2 columns to fill the width.' +
              ' If there is an odd number of panels, the column with fewer panels must have those panels stretched taller to fill the full height — NO empty or blank cells allowed.';
          }

          const mobileRequest: ImageGenerationRequest = {
            ...request,
            prompt: mobilePrompt,
            width: mobileW,
            height: mobileH,
            dualViewport: false,
            customInstructions: mobileCustom,
          };
          const mobileResult = await this.generateImage(mobileRequest, userId, tenantId);
          if (mobileResult.success) {
            result.mobileVariant = {
              imageUrl: mobileResult.imageUrl,
              imageId: mobileResult.imageId,
              componentMap: mobileResult.componentMap,
            };
            this.logger.log(`[ImageGenerator] ✅ Mobile variant generated: ${mobileResult.imageId}`);

            // Link the pair: desktop → mobile, mobile → desktop
            if (savedImageId && mobileResult.imageId) {
              try {
                await this.generatedImageRepository.update(savedImageId, { pairedImageId: mobileResult.imageId });
                await this.generatedImageRepository.update(mobileResult.imageId, { pairedImageId: savedImageId });
                this.logger.log(`[ImageGenerator] 🔗 Linked image pair: ${savedImageId} ↔ ${mobileResult.imageId}`);
              } catch (linkErr: any) {
                this.logger.warn(`[ImageGenerator] ⚠️ Failed to link pair: ${linkErr.message}`);
              }
            }
          } else {
            this.logger.warn(`[ImageGenerator] ⚠️ Mobile variant failed: ${mobileResult.error}`);
          }
        } catch (mobileErr: any) {
          this.logger.warn(`[ImageGenerator] ⚠️ Mobile variant error: ${mobileErr.message}`);
        }
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
    } // end retry for-loop

    // Auto-report the movie/TV reference as troublesome when all retries exhausted
    if (request.userInput && lastFinishReason) {
      this.addTroublesomeReference(request.userInput, `finishReason=${lastFinishReason} after ${MAX_RETRIES} retries`).catch(() => {});
      this.logger.warn(`[ImageGenerator] Auto-reported troublesome reference: "${request.userInput}"`);
    }

    // Should not reach here, but safety net
    return {
      success: false,
      error: `Image generation failed after ${MAX_RETRIES} attempts (last finishReason=${lastFinishReason}). Try a different prompt or theme.`,
    };
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
      
      // Increment user's token usage counter
      try {
        // Only increment if userId is a valid UUID (not 'default-user')
        if (data.userId && data.userId !== 'default-user' && this.isValidUUID(data.userId)) {
          await this.usersService.incrementTokenUsage(data.userId, data.tokensUsed);
          this.logger.log(
            `[ImageGenerator] Incremented token usage for user ${data.userId}: +${data.tokensUsed} tokens`,
          );
        } else {
          this.logger.warn(
            `[ImageGenerator] Skipping token increment - invalid userId: ${data.userId}`,
          );
        }
      } catch (incrementError: any) {
        this.logger.error(
          `[ImageGenerator] Failed to increment token usage for user ${data.userId}: ${incrementError.message}`,
        );
        // Don't throw - token increment failure shouldn't break the request
      }
    } catch (error: any) {
      this.logger.error(`[ImageGenerator] Failed to log LLM usage: ${error.message}`, error.stack);
      // Don't throw - logging failure shouldn't break the request
    }
  }

  /**
   * Returns the N most recent generated images (all lessons) for admin observability.
   */
  async getRecentImages(limit = 10): Promise<any[]> {
    try {
      const images = await this.generatedImageRepository.find({
        order: { createdAt: 'DESC' },
        take: limit,
      });
      return Promise.all(images.map(async (image) => {
        const signedUrl = await this.getSignedUrlSafe(image.imageUrl);
        return {
          id: image.id,
          prompt: image.prompt,
          imageUrl: signedUrl,
          width: image.width,
          height: image.height,
          lessonId: image.lessonId,
          paramHash: image.paramHash,
          personalisationTags: image.personalisationTags,
          dictionaryLabels: image.dictionaryLabels,
          componentMap: image.componentMap,
          metadata: image.metadata,
          createdAt: image.createdAt,
        };
      }));
    } catch (err: any) {
      this.logger.warn(`[ImageGenerator] getRecentImages error: ${err.message}`);
      return [];
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
            imageUrl: publicImageUrl,
            mimeType: image.mimeType,
            width: image.width,
            height: image.height,
            prompt: image.prompt,
            substageId: image.substageId,
            interactionId: image.interactionId,
            metadata: image.metadata,
            paramHash: image.paramHash,
            personalisationTags: image.personalisationTags,
            componentMap: image.componentMap,
            dictionaryLabels: image.dictionaryLabels,
            pairedImageId: image.pairedImageId,
            userInput: image.userInput,
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
   * Find image pairs for a lesson by interest/userInput.
   * Returns desktop images (16:9) that have a paired mobile variant.
   * Search priority: matching interests first, then any available pair.
   */
  async findImagePairsByInterest(
    lessonId: string,
    interactionId: string | null,
    interests: string[],
    dictionaryLabel?: string,
  ): Promise<{ desktop: any; mobile: any } | null> {
    try {
      const qb = this.generatedImageRepository.createQueryBuilder('img')
        .where('img.lessonId = :lessonId', { lessonId })
        .andWhere('img.pairedImageId IS NOT NULL')
        .andWhere('img.width >= img.height'); // desktop = landscape

      if (interactionId) {
        qb.andWhere('img.interactionId = :interactionId', { interactionId });
      }

      // Try matching interests first
      if (interests.length > 0) {
        const interestMatch = await qb.clone()
          .andWhere('img.userInput IN (:...interests)', { interests })
          .orderBy('img.createdAt', 'DESC')
          .getOne();

        if (interestMatch) {
          return this.buildImagePairResponse(interestMatch);
        }
      }

      // Try matching dictionary labels
      if (dictionaryLabel) {
        const labelMatch = await qb.clone()
          .andWhere(':label = ANY(img.dictionaryLabels)', { label: dictionaryLabel })
          .orderBy('img.createdAt', 'DESC')
          .getOne();

        if (labelMatch) {
          return this.buildImagePairResponse(labelMatch);
        }
      }

      // Fall back to any available pair for this lesson/interaction
      const anyPair = await qb.orderBy('img.createdAt', 'DESC').getOne();
      if (anyPair) {
        this.logger.log(`[ImageGenerator] Falling back to any available pair for lesson ${lessonId}`);
        return this.buildImagePairResponse(anyPair);
      }

      return null;
    } catch (error: any) {
      this.logger.error(`[ImageGenerator] Error finding image pairs: ${error.message}`);
      return null;
    }
  }

  private async buildImagePairResponse(desktopImage: GeneratedImage): Promise<{ desktop: any; mobile: any } | null> {
    if (!desktopImage.pairedImageId) return null;

    const mobileImage = await this.generatedImageRepository.findOne({ where: { id: desktopImage.pairedImageId } });
    if (!mobileImage) return null;

    const [desktopUrl, mobileUrl] = await Promise.all([
      this.fileStorageService.getSignedUrl(desktopImage.imageUrl, 7 * 24 * 60 * 60),
      this.fileStorageService.getSignedUrl(mobileImage.imageUrl, 7 * 24 * 60 * 60),
    ]);

    return {
      desktop: {
        imageId: desktopImage.id,
        imageUrl: desktopUrl || desktopImage.imageUrl,
        componentMap: desktopImage.componentMap,
        userInput: desktopImage.userInput,
      },
      mobile: {
        imageId: mobileImage.id,
        imageUrl: mobileUrl || mobileImage.imageUrl,
        componentMap: mobileImage.componentMap,
      },
    };
  }

  /**
   * Use an LLM call to select the best TV show/movie from user preferences
   * that matches the lesson content theme. Falls back to a generic art style
   * if the user has no preferences or the LLM call fails.
   */
  async selectBestTheme(
    userId: string,
    contentItems: string[],
    contentTitle?: string,
  ): Promise<{ theme: string; source: 'personalisation' | 'fallback' }> {
    const FULL_THEME_CATALOGUE = [
      'Breaking Bad', 'The Simpsons', 'Studio Ghibli', 'Pixar', 'Avatar: The Last Airbender',
      'Stranger Things', 'Star Wars', 'Harry Potter', 'The Lord of the Rings', 'Marvel',
      'SpongeBob SquarePants', 'Rick and Morty', 'Minecraft', 'Pokémon', 'Jurassic Park',
      'Finding Nemo', 'Frozen', 'The Lion King', 'Toy Story', 'Shrek',
      'Doctor Who', 'Naruto', 'Dragon Ball Z', 'One Piece', 'Demon Slayer',
      'The Mandalorian', 'Game of Thrones', 'Gravity Falls', 'Adventure Time', 'Bluey',
      'Back to the Future', 'Willy Wonka', 'Despicable Me', 'Spider-Verse', 'Inside Out',
      'Moana', 'Coco', 'Wall-E', 'Up', 'The Incredibles',
    ];

    try {
      const userPrefs = await this.contentCacheService.getUserTvMoviePreferences(userId);
      const hasUserPrefs = userPrefs && userPrefs.length > 0;

      // Build the candidate list: user prefs when available, otherwise full catalogue
      const candidates = hasUserPrefs ? userPrefs : FULL_THEME_CATALOGUE;
      const source: 'personalisation' | 'fallback' = hasUserPrefs ? 'personalisation' : 'fallback';

      if (candidates.length === 1) {
        this.logger.log(`[SelectTheme] Single candidate: "${candidates[0]}" (${source})`);
        return { theme: candidates[0], source };
      }

      const apiConfig = await this.getApiConfig();
      if (!apiConfig?.apiEndpoint || !apiConfig?.apiKey) {
        const theme = candidates[Math.floor(Math.random() * candidates.length)];
        this.logger.warn(`[SelectTheme] No API config, randomly picking: "${theme}"`);
        return { theme, source };
      }

      const itemsList = contentItems.join(', ');
      const prefsList = candidates.map((p, i) => `${i + 1}. ${p}`).join('\n');

      const contextLabel = hasUserPrefs
        ? `The user's favourite TV shows/movies are`
        : `Choose from this list of popular TV shows/movies`;

      const prompt =
        `You are choosing a visual art style for a matching-game illustration.\n` +
        `The game content is about: ${contentTitle ? contentTitle + ' — ' : ''}${itemsList}\n\n` +
        `${contextLabel}:\n${prefsList}\n\n` +
        `Which ONE show/movie has the visual style and themes most relevant to the game content? ` +
        `Pick the single best match based on thematic and visual fit.\n` +
        `Respond with ONLY the exact name from the list — no quotes, no explanation.`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 50 },
      };

      const apiKeyHeader = apiConfig.apiKeyHeader || 'x-goog-api-key';
      const response = await fetch(apiConfig.apiEndpoint, {
        method: 'POST',
        headers: { [apiKeyHeader]: apiConfig.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const theme = candidates[Math.floor(Math.random() * candidates.length)];
        this.logger.warn(`[SelectTheme] LLM API error ${response.status}, randomly picking: "${theme}"`);
        return { theme, source };
      }

      const data = await response.json();
      const textPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
      const chosen = textPart?.text?.trim();

      if (chosen) {
        const matchedCandidate =
          candidates.find(c => c.toLowerCase() === chosen.toLowerCase()) ||
          candidates.find(c =>
            chosen.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(chosen.toLowerCase()),
          );

        if (matchedCandidate) {
          this.logger.log(`[SelectTheme] LLM chose: "${matchedCandidate}" (${source}) for content: "${contentTitle || itemsList.substring(0, 60)}"`);
          return { theme: matchedCandidate, source };
        }

        this.logger.warn(`[SelectTheme] LLM returned "${chosen}" which doesn't match any candidate. Using first candidate.`);
      }

      return { theme: candidates[0], source };
    } catch (err: any) {
      this.logger.warn(`[SelectTheme] Error: ${err.message}`);
      const theme = FULL_THEME_CATALOGUE[Math.floor(Math.random() * FULL_THEME_CATALOGUE.length)];
      return { theme, source: 'fallback' };
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
        paramHash: image.paramHash,
        personalisationTags: image.personalisationTags,
        componentMap: image.componentMap,
        dictionaryLabels: image.dictionaryLabels,
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

  // ─── Cache / Component Map Helpers ─────────────────────────────

  /**
   * Safely generate a signed URL; returns the original URL on failure.
   */
  private async getSignedUrlSafe(imageUrl: string): Promise<string> {
    try {
      const signed = await this.fileStorageService.getSignedUrl(imageUrl, 7 * 24 * 60 * 60);
      return signed || imageUrl;
    } catch {
      return imageUrl;
    }
  }

  /**
   * Run a follow-up LLM call to detect labelled components (objects, regions)
   * in a generated image and return their bounding-box coordinates.
   *
   * Result format:
   * { components: [{ label: string, x: number, y: number, width: number, height: number, confidence?: number }] }
   */
  private async generateComponentMap(
    image: GeneratedImage,
    componentPromptContent?: string,
  ): Promise<Record<string, any> | null> {
    try {
      this.logger.log(`[ComponentMap] Starting component map generation for image ${image.id} (${image.imageUrl})`);
      const apiConfig = await this.getApiConfig();
      if (!apiConfig?.apiEndpoint || !apiConfig?.apiKey) {
        this.logger.warn(`[ComponentMap] No API config available, skipping component map`);
        return null;
      }

      let base64Data: string | null = null;
      try {
        const buf = await this.fileStorageService.readFile(image.imageUrl);
        base64Data = buf.toString('base64');
        this.logger.log(`[ComponentMap] Read ${(buf.length / 1024).toFixed(0)}KB image data from storage`);
      } catch (err: any) {
        this.logger.warn(`[ComponentMap] Failed to read image ${image.id} from storage: ${err.message}`);
        try {
          const signedUrl = await this.getSignedUrlSafe(image.imageUrl);
          this.logger.log(`[ComponentMap] Fallback: fetching via signed URL...`);
          const resp = await fetch(signedUrl);
          if (resp.ok) {
            const fetchBuf = Buffer.from(await resp.arrayBuffer());
            base64Data = fetchBuf.toString('base64');
            this.logger.log(`[ComponentMap] Fallback fetch succeeded: ${(fetchBuf.length / 1024).toFixed(0)}KB`);
          }
        } catch (fetchErr: any) {
          this.logger.warn(`[ComponentMap] Fallback fetch also failed for ${image.id}: ${fetchErr.message}`);
          return null;
        }
      }
      if (!base64Data) {
        this.logger.warn(`[ComponentMap] No image data available for ${image.id}`);
        return null;
      }

      const detectPrompt = componentPromptContent
        ? `Analyze this image and locate each of the following items/steps. They may be arranged in a grid, scattered across a scene, or depicted as objects within a single illustration.

The items IN ORDER are: ${componentPromptContent}

For EACH item, find the visual region or object in the image that represents it. Provide a bounding box as percentages of image width (0-100) and height (0-100).

RULES:
1. The "label" field MUST be the EXACT item name from the list above, copied verbatim — do NOT rephrase, abbreviate, or expand.
2. Bounding boxes should be GENEROUS — extend the box well beyond the object edges by at least 3-5% in each direction. It is much better to have a slightly oversized box than to miss part of the object. The user will click anywhere inside this box, so coverage is critical.
3. Every box must have a minimum width of 10 and minimum height of 10 (as percentages). Small objects should still get large clickable regions.
4. The image contains NO text — identify items by their visual depiction (objects, scenes, colours, actions).
5. If items are in a grid, go left-to-right then top-to-bottom. If scattered in a scene, locate each object wherever it appears.
6. Boxes may overlap slightly — that is preferred over leaving gaps between nearby items.

Respond ONLY with valid JSON (no markdown, no explanation):
{"components":[{"label":"exact item name","x":0,"y":0,"width":0,"height":0}]}

Where x,y is the top-left corner and width,height is the size, all as percentages (0-100).
Return EXACTLY one entry per item, in the same order as listed above.`
        : `Analyze this image and identify all distinct visual components, objects, or regions.
For each component, provide its label and bounding-box coordinates as percentages of image width/height (0-100).

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{"components":[{"label":"string","x":0,"y":0,"width":0,"height":0}]}

Where x,y is the top-left corner position as a percentage, and width,height are the size as percentages.`;

      const payload = {
        contents: [{
          parts: [
            { text: detectPrompt },
            { inlineData: { mimeType: image.mimeType || 'image/png', data: base64Data } },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      };

      const apiKeyHeader = apiConfig.apiKeyHeader || 'x-goog-api-key';
      const response = await fetch(apiConfig.apiEndpoint, {
        method: 'POST',
        headers: { [apiKeyHeader]: apiConfig.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        this.logger.warn(`[ComponentMap] API error ${response.status}: ${errBody.substring(0, 200)}`);
        return null;
      }

      const data = await response.json();
      const textPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
      if (!textPart?.text) {
        this.logger.warn(`[ComponentMap] No text in API response. finishReason: ${data.candidates?.[0]?.finishReason}`);
        return null;
      }

      let jsonStr = textPart.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const componentMap = JSON.parse(jsonStr);
      this.logger.log(`[ComponentMap] ✅ Detected ${componentMap.components?.length || 0} components for image ${image.id}`);
      if (componentMap.components) {
        componentMap.components.forEach((c: any) => {
          this.logger.log(`[ComponentMap]   "${c.label}" → x:${c.x} y:${c.y} w:${c.width} h:${c.height}`);
        });
      }
      return componentMap;
    } catch (err: any) {
      this.logger.warn(`[ComponentMap] Failed to generate component map: ${err.message}`);
      return null;
    }
  }

  /**
   * Find a cached text-free image to fall back to when text detection fails on all attempts.
   * Priority: 1) matching personalisation tags (TV/movie themes), 2) matching dictionary labels,
   * 3) any cached image for the same lesson/interaction.
   */
  private async findTextFreeFallback(
    request: ImageGenerationRequest,
    personalisationTags: string[],
  ): Promise<GeneratedImage | null> {
    try {
      const qb = this.generatedImageRepository.createQueryBuilder('img')
        .andWhere('img.width >= img.height'); // desktop = landscape

      if (request.lessonId) {
        qb.andWhere('img.lessonId = :lessonId', { lessonId: request.lessonId });
      }
      if (request.interactionId && this.isValidUUID(request.interactionId)) {
        qb.andWhere('img.interactionId = :interactionId', { interactionId: request.interactionId });
      }

      // 1. Prefer images whose userInput matches one of the user's TV/movie tags
      const tvTags = personalisationTags.filter(t => t.startsWith('tv:'));
      if (tvTags.length > 0) {
        const interests = tvTags.map(t => {
          const raw = t.replace('tv:', '');
          return raw.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        });
        const personalisedMatch = await qb.clone()
          .andWhere('LOWER(img.userInput) IN (:...interests)', {
            interests: interests.map(i => i.toLowerCase()),
          })
          .orderBy('img.createdAt', 'DESC')
          .getOne();

        if (personalisedMatch) {
          this.logger.log(`[TextFallback] Found personalisation-matching fallback: ${personalisedMatch.id} (${personalisedMatch.userInput})`);
          return personalisedMatch;
        }
      }

      // 2. Try matching dictionary labels
      const dictLabels = (request.dictionaryLabels || [])
        .map(l => l.trim().toLowerCase().replace(/\s+/g, '-'))
        .filter(l => l.length > 0);
      for (const label of dictLabels) {
        const labelMatch = await qb.clone()
          .andWhere(':label = ANY(img.dictionaryLabels)', { label })
          .orderBy('img.createdAt', 'DESC')
          .getOne();
        if (labelMatch) {
          this.logger.log(`[TextFallback] Found dictionary-label fallback: ${labelMatch.id} (label: ${label})`);
          return labelMatch;
        }
      }

      // 3. Any cached image for same lesson/interaction
      const anyMatch = await qb.orderBy('img.createdAt', 'DESC').getOne();
      if (anyMatch) {
        this.logger.log(`[TextFallback] Using any available cached image: ${anyMatch.id}`);
        return anyMatch;
      }

      return null;
    } catch (err: any) {
      this.logger.warn(`[TextFallback] Error finding fallback: ${err.message}`);
      return null;
    }
  }

  /**
   * Detect whether a generated image contains text/captions/labels.
   * Uses Gemini vision to inspect the base64 image data.
   * Returns true if text is detected, false if the image is text-free.
   */
  private async detectTextInImage(base64Data: string, mimeType: string): Promise<boolean> {
    try {
      const apiConfig = await this.getApiConfig();
      if (!apiConfig?.apiEndpoint || !apiConfig?.apiKey) return false;

      const payload = {
        contents: [{
          parts: [
            {
              text: 'Look at this image carefully. Does it contain ANY visible text, letters, numbers, words, labels, captions, titles, annotations, or written characters of any kind?\n' +
                'Respond with ONLY a JSON object: {"hasText": true} or {"hasText": false}\n' +
                'Even a single letter or number counts as text. Be strict.'
            },
            { inlineData: { mimeType, data: base64Data } },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      };

      const apiKeyHeader = apiConfig.apiKeyHeader || 'x-goog-api-key';
      const response = await fetch(apiConfig.apiEndpoint, {
        method: 'POST',
        headers: { [apiKeyHeader]: apiConfig.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.warn(`[TextDetect] API error ${response.status}, assuming no text`);
        return false;
      }

      const data = await response.json();
      const textPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
      if (!textPart?.text) return false;

      let jsonStr = textPart.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      try {
        const result = JSON.parse(jsonStr);
        this.logger.log(`[TextDetect] Result: hasText=${result.hasText}`);
        return !!result.hasText;
      } catch {
        const hasTextMatch = jsonStr.toLowerCase().includes('"hastext": true') || jsonStr.toLowerCase().includes('"hastext":true');
        this.logger.log(`[TextDetect] JSON parse fallback, hasText=${hasTextMatch}`);
        return hasTextMatch;
      }
    } catch (err: any) {
      this.logger.warn(`[TextDetect] Detection failed: ${err.message}, assuming no text`);
      return false;
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

  // ─── Troublesome References ──────────────────────────────────────
  // Stored in ai_prompts table: assistant_id='image-generator', prompt_key='troublesome-references'
  // Content is a JSON array: [{ reference: string, reason?: string, count: number, firstSeen: string, lastSeen: string }]

  private readonly TROUBLESOME_KEY = 'troublesome-references';

  async getTroublesomeReferences(): Promise<any[]> {
    try {
      const row = await this.aiPromptRepository.findOne({
        where: { assistantId: 'image-generator', promptKey: this.TROUBLESOME_KEY },
      });
      if (!row?.content) return [];
      return JSON.parse(row.content);
    } catch (err: any) {
      this.logger.warn(`[TroublesomeRefs] Failed to load: ${err.message}`);
      return [];
    }
  }

  async addTroublesomeReference(reference: string, reason?: string): Promise<{ success: boolean; entry: any }> {
    const refs = await this.getTroublesomeReferences();
    const normalised = reference.trim().toLowerCase();
    const now = new Date().toISOString();

    const existing = refs.find((r: any) => r.reference.toLowerCase() === normalised);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.lastSeen = now;
      if (reason) existing.reason = reason;
      this.logger.log(`[TroublesomeRefs] Updated count for "${reference}" → ${existing.count}`);
    } else {
      const entry = { reference: reference.trim(), reason: reason || 'finishReason=OTHER', count: 1, firstSeen: now, lastSeen: now };
      refs.push(entry);
      this.logger.log(`[TroublesomeRefs] Added new reference: "${reference}"`);
    }

    await this.saveTroublesomeReferences(refs);
    return { success: true, entry: existing || refs[refs.length - 1] };
  }

  async removeTroublesomeReference(reference: string): Promise<{ success: boolean }> {
    let refs = await this.getTroublesomeReferences();
    const normalised = reference.trim().toLowerCase();
    refs = refs.filter((r: any) => r.reference.toLowerCase() !== normalised);
    await this.saveTroublesomeReferences(refs);
    this.logger.log(`[TroublesomeRefs] Removed reference: "${reference}"`);
    return { success: true };
  }

  private async saveTroublesomeReferences(refs: any[]): Promise<void> {
    const content = JSON.stringify(refs);
    let row = await this.aiPromptRepository.findOne({
      where: { assistantId: 'image-generator', promptKey: this.TROUBLESOME_KEY },
    });
    if (row) {
      row.content = content;
      await this.aiPromptRepository.save(row);
    } else {
      await this.aiPromptRepository.save(
        this.aiPromptRepository.create({
          assistantId: 'image-generator',
          promptKey: this.TROUBLESOME_KEY,
          label: 'Troublesome References (JSON)',
          content,
        }),
      );
    }
  }
}

