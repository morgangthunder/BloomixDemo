import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GrokService, GrokRequest, GrokResponse } from './grok.service';
import { AiPromptsService } from '../modules/ai-prompts/ai-prompts.service';
import { WeaviateService } from './weaviate.service';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';
import { User } from '../entities/user.entity';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatRequest {
  assistantId: string; // 'inventor' | 'ai-interaction-handler' | 'lesson-builder' | etc.
  promptKey: string; // 'html-interaction' | 'general' | etc.
  userMessage: string;
  context?: any; // Additional context (e.g., current interaction data)
  conversationHistory?: ChatMessage[]; // Previous messages in the conversation
}

export interface AssistantChatResponse {
  content: string;
  suggestedChanges?: {
    settings?: { id?: string; name?: string; description?: string };
    code?: { html?: string; css?: string; js?: string };
    configSchema?: any;
    sampleData?: any;
  };
  tokensUsed: number;
  assistantId: string;
  promptKey: string;
}

/**
 * Reusable AI Assistant Service
 * Handles chat interactions with AI assistants (inventor, ai-interaction-handler, lesson-builder, etc.)
 * 
 * Features:
 * - Loads prompts from database
 * - Calls Grok API with context
 * - Tracks LLM usage with assistant_id
 * - Parses responses for suggested changes
 */
@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  
  // Threshold for conversation history length (characters)
  // When exceeded, we summarize the history to keep context manageable
  private readonly CONVERSATION_HISTORY_THRESHOLD = 6000;
  
  // Maximum estimated tokens for a request (conservative estimate: ~4 chars per token)
  // Grok typically allows 32k tokens, but we set a lower limit to be safe
  private readonly MAX_ESTIMATED_TOKENS = 28000; // Leave room for response
  private readonly CHARS_PER_TOKEN = 4; // Conservative estimate

  constructor(
    private grokService: GrokService,
    private aiPromptsService: AiPromptsService,
    private weaviateService: WeaviateService,
    @InjectRepository(LlmGenerationLog)
    private llmLogRepository: Repository<LlmGenerationLog>,
    @InjectRepository(ProcessedContentOutput)
    private processedOutputRepository: Repository<ProcessedContentOutput>,
  ) {}

  /**
   * Send a chat message to an AI assistant
   */
  async chat(
    request: AssistantChatRequest,
    user: User,
  ): Promise<AssistantChatResponse> {
    const startTime = Date.now();

    try {
      // 1. Load the prompt from database
      const prompt = await this.aiPromptsService.findByKey(
        request.assistantId,
        request.promptKey,
      );

      if (!prompt) {
        throw new Error(
          `Prompt not found for assistant: ${request.assistantId}, key: ${request.promptKey}`,
        );
      }

      this.logger.log(
        `[${request.assistantId}] Using prompt: ${request.promptKey}`,
      );

      // 2. Process conversation history (summarize if needed)
      let processedHistory = request.conversationHistory || [];
      const historyLength = this.calculateHistoryLength(processedHistory);
      
      if (historyLength > this.CONVERSATION_HISTORY_THRESHOLD) {
        this.logger.log(
          `[${request.assistantId}] Conversation history exceeds threshold (${historyLength} chars), summarizing...`,
        );
        const summary = await this.summarizeConversationHistory(
          processedHistory,
          request.assistantId,
          user,
        );
        // Replace history with summary
        processedHistory = [
          {
            role: 'user' as const,
            content: `[Previous conversation summary]: ${summary}`,
          },
        ];
        this.logger.log(
          `[${request.assistantId}] History summarized to ${summary.length} characters`,
        );
      }

      // 2.5. For teacher assistant, perform Weaviate search to find relevant content chunks
      let relevantContentChunks: any[] = [];
      if (request.assistantId === 'teacher' && request.context?.lessonId) {
        try {
          relevantContentChunks = await this.searchRelevantContentForLesson(
            request.userMessage,
            request.context.lessonId,
            user.tenantId,
          );
          this.logger.log(
            `[teacher] Found ${relevantContentChunks.length} relevant content chunks from Weaviate`,
          );
        } catch (error) {
          this.logger.error(
            `[teacher] Failed to search Weaviate: ${error.message}`,
          );
          // Continue without Weaviate results
        }
      }

      // 3. Build Grok request with system prompt + conversation history + current user message
      // Replace placeholders in prompt content for teacher assistant
      let systemPromptContent = prompt.content;
      if (request.assistantId === 'teacher' && request.context?.lessonId) {
        // Replace placeholders in the prompt
        systemPromptContent = systemPromptContent
          .replace('{lesson_data}', 'See user message below')
          .replace('{relevant_content_chunks}', 'See user message below')
          .replace('{conversation_history}', 'See user message below')
          .replace('{student_question}', 'See user message below');

        // Load and include screenshot criteria prompt for teacher assistant
        try {
          const screenshotCriteriaPrompt = await this.aiPromptsService.findByKey(
            'teacher',
            'screenshot-criteria',
          );
          if (screenshotCriteriaPrompt) {
            systemPromptContent += `\n\n=== SCREENSHOT REQUEST CRITERIA ===\n${screenshotCriteriaPrompt.content}`;
            this.logger.log('[teacher] Included screenshot criteria in prompt');
          }
        } catch (error) {
          this.logger.warn(
            `[teacher] Failed to load screenshot criteria prompt: ${error.message}`,
          );
          // Continue without screenshot criteria
        }
      }

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: systemPromptContent,
        },
      ];

      // Add conversation history
      for (const msg of processedHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      // Build user message with context
      const userMessageContent = this.buildUserMessage(
        request.userMessage,
        request.context,
        relevantContentChunks,
      );

      // 3.5. Check total message size and summarize if needed to avoid token limits
      const totalChars = this.estimateTotalChars(messages, userMessageContent, systemPromptContent);
      const estimatedTokens = Math.ceil(totalChars / this.CHARS_PER_TOKEN);
      
      if (estimatedTokens > this.MAX_ESTIMATED_TOKENS) {
        this.logger.warn(
          `[${request.assistantId}] Estimated tokens (${estimatedTokens}) exceed limit (${this.MAX_ESTIMATED_TOKENS}), summarizing system prompt...`,
        );
        
        // Summarize the system prompt to reduce size
        try {
          const summarizedPrompt = await this.summarizePrompt(
            systemPromptContent,
            request.assistantId,
            user,
          );
          systemPromptContent = summarizedPrompt;
          messages[0].content = summarizedPrompt;
          this.logger.log(
            `[${request.assistantId}] System prompt summarized from ${systemPromptContent.length} to ${summarizedPrompt.length} chars`,
          );
        } catch (error) {
          this.logger.error(
            `[${request.assistantId}] Failed to summarize prompt: ${error.message}`,
          );
          // Continue with original prompt - might hit token limit but better than failing
        }
      }

      // Add current user message with context
      messages.push({
        role: 'user',
        content: userMessageContent,
      });

      const grokRequest: GrokRequest = {
        messages,
        temperature: 0.7,
        maxTokens: 2000,
        lessonContext: request.context,
      };

      // 3. Call Grok API
      const grokResponse: GrokResponse = await this.grokService.chatCompletion(
        grokRequest,
      );

      // 5. Parse response for suggested changes (if applicable)
      const suggestedChanges = this.parseSuggestedChanges(
        grokResponse.content,
        request.assistantId,
      );

      // 6. Log usage to database
      const processingTime = Date.now() - startTime;
      await this.logUsage({
        userId: user.id,
        tenantId: user.tenantId,
        assistantId: request.assistantId,
        promptKey: request.promptKey,
        promptText: prompt.content,
        userMessage: request.userMessage,
        response: grokResponse.content,
        tokensUsed: grokResponse.tokensUsed,
        processingTimeMs: processingTime,
        requestPayload: grokRequest,
        responsePayload: grokResponse,
      });

      // 7. Return response
      return {
        content: grokResponse.content,
        suggestedChanges,
        tokensUsed: grokResponse.tokensUsed,
        assistantId: request.assistantId,
        promptKey: request.promptKey,
      };
    } catch (error) {
      this.logger.error(
        `[${request.assistantId}] Chat error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Build user message with context
   */
  private buildUserMessage(
    userMessage: string,
    context?: any,
    relevantContentChunks?: any[],
  ): string {
    if (!context) {
      return userMessage;
    }

    // Add context information to the user message
    let contextualMessage = userMessage;

    // For teacher assistant, include lesson data and Weaviate search results
    if (context.lessonId && context.lessonData) {
      // Add current stage and sub-stage information (IMPORTANT: Always include this for context)
      if (context.currentStageInfo) {
        contextualMessage += `\n\n=== CURRENT STAGE AND SUB-STAGE ===\n`;
        if (context.currentStageInfo.stage) {
          contextualMessage += `Stage: ${context.currentStageInfo.stage.title}`;
          if (context.currentStageInfo.stage.type) {
            contextualMessage += ` (${context.currentStageInfo.stage.type})`;
          }
          contextualMessage += `\n`;
        }
        if (context.currentStageInfo.subStage) {
          contextualMessage += `Sub-Stage: ${context.currentStageInfo.subStage.title}`;
          if (context.currentStageInfo.subStage.type) {
            contextualMessage += ` (${context.currentStageInfo.subStage.type})`;
          }
          contextualMessage += `\n`;
        }
        contextualMessage += `\nThe student is currently viewing this stage/sub-stage in the lesson. Use this context to provide relevant guidance.\n`;
        
        // If processed content data is available (e.g., video metadata), include it
        if (context.currentStageInfo.processedContentData) {
          contextualMessage += `\n=== CURRENT INTERACTION CONTENT ===\n`;
          const processedData = context.currentStageInfo.processedContentData;
          
          // Include video metadata - check both nested metadata object and direct fields
          // YouTube service returns: { title, description, thumbnail, duration, channel }
          // Metadata might be stored directly or nested under 'metadata'
          const metadata = processedData.metadata || processedData;
          
          contextualMessage += `Video Metadata:\n`;
          if (metadata.title || processedData.title) {
            contextualMessage += `Title: ${metadata.title || processedData.title}\n`;
          }
          if (metadata.description || processedData.description) {
            contextualMessage += `Description: ${(metadata.description || processedData.description || '').substring(0, 500)}${(metadata.description || processedData.description || '').length > 500 ? '...' : ''}\n`;
          }
          if (metadata.duration || processedData.duration) {
            contextualMessage += `Duration: ${metadata.duration || processedData.duration}\n`;
          }
          // Check for channel (YouTube service returns 'channel', not 'channelTitle')
          if (metadata.channel || metadata.channelTitle || processedData.channel) {
            contextualMessage += `Channel/Creator: ${metadata.channel || metadata.channelTitle || processedData.channel}\n`;
          }
          if (metadata.tags && Array.isArray(metadata.tags)) {
            contextualMessage += `Tags: ${metadata.tags.join(', ')}\n`;
          }
          if (metadata.thumbnail || processedData.thumbnail) {
            contextualMessage += `Thumbnail: ${metadata.thumbnail || processedData.thumbnail}\n`;
          }
          // Include source URL - check multiple possible locations
          const sourceUrl = processedData.url || metadata.url || processedData.sourceUrl || metadata.sourceUrl;
          if (sourceUrl) {
            contextualMessage += `Source URL: ${sourceUrl}\n`;
          }
          
          contextualMessage += `\nThe student is currently interacting with this video content. Use this information to answer questions about the video, including who created it (the channel/creator), what it's about (title and description), and any other relevant details.\n`;
        }
      }

      contextualMessage += `\n\n=== LESSON DATA ===\n`;
      contextualMessage += JSON.stringify(context.lessonData, null, 2);
      contextualMessage += `\n`;

      // Add relevant content chunks from Weaviate
      if (relevantContentChunks && relevantContentChunks.length > 0) {
        contextualMessage += `\n=== RELEVANT CONTENT CHUNKS ===\n`;
        relevantContentChunks.forEach((chunk, idx) => {
          contextualMessage += `\n[Content Chunk ${idx + 1}]\n`;
          if (chunk.title) {
            contextualMessage += `Title: ${chunk.title}\n`;
          }
          if (chunk.summary) {
            contextualMessage += `Summary: ${chunk.summary}\n`;
          }
          if (chunk.fullText) {
            // Truncate fullText to first 500 chars to avoid token bloat
            const truncatedText =
              chunk.fullText.length > 500
                ? chunk.fullText.substring(0, 500) + '...'
                : chunk.fullText;
            contextualMessage += `Content: ${truncatedText}\n`;
          }
          if (chunk.topics && chunk.topics.length > 0) {
            contextualMessage += `Topics: ${chunk.topics.join(', ')}\n`;
          }
          if (chunk.sourceUrl) {
            contextualMessage += `Source: ${chunk.sourceUrl}\n`;
          }
          contextualMessage += `\n`;
        });
      }

      // Add iframe screenshot context if present
      if (context.screenshot) {
        contextualMessage += `\n=== SCREENSHOT ===\n`;
        contextualMessage += `${context.screenshot}\n`;
      }

      if (context.documentContent) {
        contextualMessage += `\n=== REFERENCE DOCUMENT ===\n`;
        contextualMessage += `${context.documentContent}\n`;
      }

      if (context.triggerEvent) {
        contextualMessage += `\n=== TRIGGER EVENT ===\n`;
        contextualMessage += `${context.triggerEvent}\n`;
      }

      return contextualMessage;
    }

    // For inventor assistant, include current interaction state
    // Support both old format (context.interaction) and new format (context.settings, context.code, etc.)
    const settings = context.settings || context.interaction;
    const code = context.code || context.interaction;
    const configSchema = context.configSchema || context.interaction?.configSchema;
    const sampleData = context.sampleData || context.interaction?.sampleData;
    const testErrors = context.testErrors;

    if (settings || code || configSchema || sampleData || testErrors) {
      contextualMessage += `\n\n=== CURRENT INTERACTION STATE ===\n`;

      // Settings
      if (settings) {
        contextualMessage += `\nSETTINGS:\n`;
        contextualMessage += `- ID: ${settings.id || 'new'}\n`;
        contextualMessage += `- Name: ${settings.name || 'Untitled'}\n`;
        contextualMessage += `- Type: ${settings.interactionTypeCategory || settings.category || 'unknown'}\n`;
        if (settings.description) {
          contextualMessage += `- Description: ${settings.description}\n`;
        }
      }

      // Code (full content, not truncated)
      if (code) {
        contextualMessage += `\nCODE:\n`;
        if (code.html) {
          contextualMessage += `HTML:\n\`\`\`html\n${code.html}\n\`\`\`\n`;
        }
        if (code.css) {
          contextualMessage += `CSS:\n\`\`\`css\n${code.css}\n\`\`\`\n`;
        }
        if (code.js) {
          contextualMessage += `JavaScript:\n\`\`\`javascript\n${code.js}\n\`\`\`\n`;
        }
        if (code.iframeUrl) {
          contextualMessage += `iFrame URL: ${code.iframeUrl}\n`;
        }
      }

      // Config Schema
      if (configSchema) {
        contextualMessage += `\nCONFIG SCHEMA:\n\`\`\`json\n${JSON.stringify(configSchema, null, 2)}\n\`\`\`\n`;
      }

      // Sample Data
      if (sampleData) {
        contextualMessage += `\nSAMPLE DATA:\n\`\`\`json\n${JSON.stringify(sampleData, null, 2)}\n\`\`\`\n`;
      }

      // Test Errors (if any)
      if (testErrors) {
        contextualMessage += `\n⚠️ TEST VALIDATION ERRORS:\n`;
        contextualMessage += `Message: ${testErrors.message}\n`;
        contextualMessage += `Error: ${testErrors.error}\n`;
        contextualMessage += `\nPlease fix these errors in your suggestions.\n`;
      }
    }

    return contextualMessage;
  }

  /**
   * Parse Grok response to extract suggested changes
   * Looks for structured JSON blocks or markdown code blocks
   */
  private parseSuggestedChanges(
    content: string,
    assistantId: string,
  ): AssistantChatResponse['suggestedChanges'] | undefined {
    // For inventor assistant, parse interaction updates
    if (assistantId === 'inventor') {
      return this.parseInventorChanges(content);
    }

    // For other assistants, return undefined (no structured changes)
    return undefined;
  }

  /**
   * Parse inventor assistant response for Settings/Code/Config/Sample Data updates
   */
  private parseInventorChanges(
    content: string,
  ): AssistantChatResponse['suggestedChanges'] | undefined {
    const changes: AssistantChatResponse['suggestedChanges'] = {};

    // Look for JSON blocks with structured updates
    // Pattern: ```json { "settings": {...}, "code": {...}, ... } ```
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/gi;
    const jsonMatches = content.match(jsonBlockRegex);

    if (jsonMatches && jsonMatches.length > 0) {
      for (const match of jsonMatches) {
        try {
          const jsonStr = match.replace(/```json\s*|\s*```/gi, '').trim();
          const parsed = JSON.parse(jsonStr);

          if (parsed.settings) {
            changes.settings = parsed.settings;
          }
          if (parsed.code) {
            changes.code = parsed.code;
          }
          if (parsed.configSchema) {
            changes.configSchema = parsed.configSchema;
          }
          if (parsed.sampleData) {
            changes.sampleData = parsed.sampleData;
          }
        } catch (e) {
          // Invalid JSON, skip
          this.logger.warn('Failed to parse JSON block in assistant response');
        }
      }
    }

    // Also look for individual code blocks with tab labels
    // Pattern: ```html ... ``` or ```css ... ``` or ```javascript ... ```
    const htmlMatch = content.match(/```html\s*([\s\S]*?)```/i);
    if (htmlMatch && !changes.code) {
      changes.code = {};
    }
    if (htmlMatch) {
      changes.code = changes.code || {};
      changes.code.html = htmlMatch[1].trim();
    }

    const cssMatch = content.match(/```css\s*([\s\S]*?)```/i);
    if (cssMatch) {
      changes.code = changes.code || {};
      changes.code.css = cssMatch[1].trim();
    }

    const jsMatch = content.match(/```(?:javascript|js)\s*([\s\S]*?)```/i);
    if (jsMatch) {
      changes.code = changes.code || {};
      changes.code.js = jsMatch[1].trim();
    }

    // Look for "SETTINGS:" section
    const settingsMatch = content.match(/SETTINGS:?\s*([\s\S]*?)(?=\n\n|```|CODE:|CONFIG:|SAMPLE:|$)/i);
    if (settingsMatch) {
      try {
        const settingsText = settingsMatch[1].trim();
        // Try to parse as JSON first
        try {
          changes.settings = JSON.parse(settingsText);
        } catch {
          // If not JSON, parse as key-value pairs
          const lines = settingsText.split('\n');
          changes.settings = {};
          for (const line of lines) {
            const match = line.match(/^\s*[-*]?\s*(\w+):\s*(.+)$/);
            if (match) {
              const key = match[1].toLowerCase();
              if (key === 'id' || key === 'name' || key === 'description') {
                changes.settings[key] = match[2].trim();
              }
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Look for "CONFIG SCHEMA:" section
    const configMatch = content.match(/CONFIG\s+SCHEMA:?\s*([\s\S]*?)(?=\n\n|```|SETTINGS:|CODE:|SAMPLE:|$)/i);
    if (configMatch) {
      try {
        const configText = configMatch[1].trim();
        changes.configSchema = JSON.parse(configText);
      } catch {
        // Try to find JSON block after "CONFIG SCHEMA:"
        const jsonAfterConfig = content.match(/CONFIG\s+SCHEMA:?\s*```json\s*([\s\S]*?)```/i);
        if (jsonAfterConfig) {
          try {
            changes.configSchema = JSON.parse(jsonAfterConfig[1].trim());
          } catch (e) {
            // Ignore
          }
        }
      }
    }

    // Look for "SAMPLE DATA:" section
    const sampleMatch = content.match(/SAMPLE\s+DATA:?\s*([\s\S]*?)(?=\n\n|```|SETTINGS:|CODE:|CONFIG:|$)/i);
    if (sampleMatch) {
      try {
        const sampleText = sampleMatch[1].trim();
        changes.sampleData = JSON.parse(sampleText);
      } catch {
        // Try to find JSON block after "SAMPLE DATA:"
        const jsonAfterSample = content.match(/SAMPLE\s+DATA:?\s*```json\s*([\s\S]*?)```/i);
        if (jsonAfterSample) {
          try {
            changes.sampleData = JSON.parse(jsonAfterSample[1].trim());
          } catch (e) {
            // Ignore
          }
        }
      }
    }

    // Return changes only if at least one field is populated
    if (
      changes.settings ||
      changes.code ||
      changes.configSchema ||
      changes.sampleData
    ) {
      return changes;
    }

    return undefined;
  }

  /**
   * Log LLM usage to database
   */
  private async logUsage(data: {
    userId: string;
    tenantId: string;
    assistantId: string;
    promptKey: string;
    promptText: string;
    userMessage: string;
    response: string;
    tokensUsed: number;
    processingTimeMs: number;
    requestPayload: GrokRequest;
    responsePayload: GrokResponse;
  }): Promise<void> {
    try {
      const log = this.llmLogRepository.create({
        userId: data.userId,
        tenantId: data.tenantId,
        assistantId: data.assistantId,
        useCase: `ai-assistant-${data.assistantId}`,
        promptText: `${data.promptKey}: ${data.userMessage}`,
        requestPayload: data.requestPayload,
        response: data.responsePayload,
        tokensUsed: data.tokensUsed,
        processingTimeMs: data.processingTimeMs,
      });

      await this.llmLogRepository.save(log);
      this.logger.log(
        `[${data.assistantId}] Logged ${data.tokensUsed} tokens for user ${data.userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log LLM usage: ${error.message}`, error.stack);
      // Don't throw - logging failure shouldn't break the request
    }
  }

  /**
   * Calculate total character length of conversation history
   */
  private calculateHistoryLength(history: ChatMessage[]): number {
    return history.reduce((total, msg) => total + msg.content.length, 0);
  }

  /**
   * Summarize conversation history when it exceeds threshold
   * Makes a separate call to Grok to create a concise summary
   */
  private async summarizeConversationHistory(
    history: ChatMessage[],
    assistantId: string,
    user: User,
  ): Promise<string> {
    this.logger.log(
      `[${assistantId}] Summarizing ${history.length} messages from conversation history`,
    );

    // Load the conversation summary prompt from database
    const summaryPrompt = await this.aiPromptsService.findByKey(
      assistantId,
      'conversation-summary',
    );

    if (!summaryPrompt) {
      this.logger.warn(
        `[${assistantId}] Conversation summary prompt not found, using fallback`,
      );
      // Fallback to simple truncation if prompt not found
      return `[Conversation summary unavailable. Previous ${history.length} messages were discussed.]`;
    }

    // Build conversation history text
    const historyText = history
      .map((msg, idx) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    // Replace placeholder in prompt template with actual conversation history
    const promptContent = summaryPrompt.content.replace(
      '{conversation_history}',
      historyText,
    );

    try {
      // Use the prompt content as the user message
      // The prompt template should contain all necessary instructions
      const summaryRequest: GrokRequest = {
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes conversation history concisely while preserving important context.',
          },
          {
            role: 'user',
            content: promptContent,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent summaries
        maxTokens: 1000, // Limit summary length
      };

      const summaryResponse = await this.grokService.chatCompletion(summaryRequest);

      // Log the summarization usage
      await this.logUsage({
        userId: user.id,
        tenantId: user.tenantId,
        assistantId: assistantId,
        promptKey: 'conversation-summary',
        promptText: summaryPrompt.content,
        userMessage: 'Summarize conversation history',
        response: summaryResponse.content,
        tokensUsed: summaryResponse.tokensUsed,
        processingTimeMs: 0, // Not tracking time for summary
        requestPayload: summaryRequest,
        responsePayload: summaryResponse,
      });

      return summaryResponse.content;
    } catch (error) {
      this.logger.error(
        `[${assistantId}] Failed to summarize conversation history: ${error.message}`,
      );
      // Fallback: return a simple truncation
      return `[Conversation summary unavailable. Previous ${history.length} messages were discussed.]`;
    }
  }

  /**
   * Search Weaviate for relevant content chunks based on student's question
   * Returns content from sources used in the lesson
   */
  private async searchRelevantContentForLesson(
    studentQuery: string,
    lessonId: string,
    tenantId: string,
  ): Promise<any[]> {
    try {
      // 1. Get all content source IDs for this lesson from ProcessedContentOutput
      const processedOutputs = await this.processedOutputRepository.find({
        where: { lessonId },
        select: ['contentSourceId'],
      });

      const contentSourceIds = processedOutputs
        .map((output) => output.contentSourceId)
        .filter((id): id is string => id !== null);

      if (contentSourceIds.length === 0) {
        this.logger.log(
          `[teacher] No content sources found for lesson ${lessonId}`,
        );
        return [];
      }

      // 2. Search Weaviate for relevant content chunks
      const searchResults = await this.weaviateService.searchByContentSourceIds(
        studentQuery,
        contentSourceIds,
        tenantId,
        5, // Limit to top 5 most relevant chunks
      );

      // 3. Format results for inclusion in prompt
      return searchResults.map((result) => ({
        title: result.title,
        summary: result.summary,
        fullText: result.fullText,
        topics: result.topics,
        keywords: result.keywords,
        sourceUrl: result.sourceUrl,
        contentCategory: result.contentCategory,
        videoId: result.videoId,
        channel: result.channel,
        transcript: result.transcript,
        relevanceScore: result.relevanceScore,
      }));
    } catch (error) {
      this.logger.error(
        `[teacher] Error searching relevant content: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Estimate total character count of all messages
   */
  private estimateTotalChars(
    messages: Array<{ role: string; content: string }>,
    userMessage: string,
    systemPrompt: string,
  ): number {
    let total = 0;
    // Count all existing messages (excluding system which we'll recalculate)
    for (const msg of messages) {
      if (msg.role !== 'system') {
        total += msg.content.length;
      }
    }
    // Add system prompt (updated/current version)
    total += systemPrompt.length;
    // Add user message
    total += userMessage.length;
    return total;
  }

  /**
   * Summarize a prompt to reduce its size while preserving key information
   */
  private async summarizePrompt(
    promptContent: string,
    assistantId: string,
    user: User,
  ): Promise<string> {
    try {
      this.logger.log(
        `[${assistantId}] Summarizing prompt (${promptContent.length} chars) to reduce token usage`,
      );

      // Create a summarization request
      const summaryRequest: GrokRequest = {
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that summarizes prompts concisely while preserving all critical instructions and guidelines.',
          },
          {
            role: 'user',
            content: `Please summarize the following prompt, keeping all essential instructions, guidelines, and requirements intact. Make it more concise but don't remove any important information:

${promptContent}`,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent summaries
        maxTokens: 2000, // Limit summary length
      };

      const summaryResponse = await this.grokService.chatCompletion(summaryRequest);

      // Log the summarization usage
      await this.logUsage({
        userId: user.id,
        tenantId: user.tenantId,
        assistantId: assistantId,
        promptKey: 'prompt-summary',
        promptText: 'Summarize prompt to reduce token usage',
        userMessage: 'Summarize prompt',
        response: summaryResponse.content,
        tokensUsed: summaryResponse.tokensUsed,
        processingTimeMs: 0,
        requestPayload: summaryRequest,
        responsePayload: summaryResponse,
      });

      return summaryResponse.content || promptContent;
    } catch (error) {
      this.logger.error(
        `[${assistantId}] Failed to summarize prompt: ${error.message}`,
      );
      // Return original prompt if summarization fails
      return promptContent;
    }
  }
}

