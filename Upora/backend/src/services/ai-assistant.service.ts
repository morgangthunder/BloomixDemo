import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GrokService, GrokRequest, GrokResponse } from './grok.service';
import { AiPromptsService } from '../modules/ai-prompts/ai-prompts.service';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { User } from '../entities/user.entity';

export interface AssistantChatRequest {
  assistantId: string; // 'inventor' | 'ai-teacher' | 'lesson-builder' | etc.
  promptKey: string; // 'html-interaction' | 'general' | etc.
  userMessage: string;
  context?: any; // Additional context (e.g., current interaction data)
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
 * Handles chat interactions with AI assistants (inventor, ai-teacher, lesson-builder, etc.)
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

  constructor(
    private grokService: GrokService,
    private aiPromptsService: AiPromptsService,
    @InjectRepository(LlmGenerationLog)
    private llmLogRepository: Repository<LlmGenerationLog>,
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

      // 2. Build Grok request with system prompt + user message
      const grokRequest: GrokRequest = {
        messages: [
          {
            role: 'system',
            content: prompt.content,
          },
          {
            role: 'user',
            content: this.buildUserMessage(request.userMessage, request.context),
          },
        ],
        temperature: 0.7,
        maxTokens: 2000,
        lessonContext: request.context,
      };

      // 3. Call Grok API
      const grokResponse: GrokResponse = await this.grokService.chatCompletion(
        grokRequest,
      );

      // 4. Parse response for suggested changes (if applicable)
      const suggestedChanges = this.parseSuggestedChanges(
        grokResponse.content,
        request.assistantId,
      );

      // 5. Log usage to database
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
      });

      // 6. Return response
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
  private buildUserMessage(userMessage: string, context?: any): string {
    if (!context) {
      return userMessage;
    }

    // Add context information to the user message
    let contextualMessage = userMessage;

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
  }): Promise<void> {
    try {
      const log = this.llmLogRepository.create({
        userId: data.userId,
        tenantId: data.tenantId,
        assistantId: data.assistantId,
        useCase: `ai-assistant-${data.assistantId}`,
        promptText: `${data.promptKey}: ${data.userMessage}`,
        response: { content: data.response },
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
}

