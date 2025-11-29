import { Injectable, Logger } from '@nestjs/common';
import { InteractionType } from '../entities/interaction-type.entity';
import { InteractionAIContextService, InteractionContext } from './interaction-ai-context.service';
import { AiPromptsService } from '../modules/ai-prompts/ai-prompts.service';

/**
 * AI Teacher Prompt Builder Service
 * Composes three-layer prompts for AI Teacher interactions:
 * 1. Base System Prompt (from ai-prompts table)
 * 2. Interaction Context (type, state, processed content, recent events)
 * 3. Builder Custom Prompt (from interactionType.aiPromptTemplate)
 */
@Injectable()
export class AITeacherPromptBuilderService {
  private readonly logger = new Logger(AITeacherPromptBuilderService.name);
  
  private readonly BASE_PROMPT_ASSISTANT = 'ai-interaction-handler';
  private readonly BASE_PROMPT_KEY = 'base-system';
  private readonly SDK_CONTENT_KEY = 'sdk-content';
  private readonly EVENT_HANDLING_KEY = 'event-handling';
  private readonly RESPONSE_FORMAT_KEY = 'response-format';

  constructor(
    private aiPromptsService: AiPromptsService,
    private interactionContextService: InteractionAIContextService,
  ) {}

  /**
   * Build complete prompt for AI Teacher interaction
   */
  async buildPrompt(
    interactionType: InteractionType,
    context: InteractionContext,
    customPrompt?: string,
  ): Promise<string> {
    // Layer 1: Base System Prompt
    const basePrompt = await this.getPrompt(this.BASE_PROMPT_KEY);
    
    // Layer 1.5: SDK Content (describes available events, actions, response structure)
    const sdkContent = await this.getPrompt(this.SDK_CONTENT_KEY);
    
    // Layer 1.6: Event Handling Instructions
    const eventHandling = await this.getPrompt(this.EVENT_HANDLING_KEY);
    
    // Layer 1.7: Response Format Instructions
    const responseFormat = await this.getPrompt(this.RESPONSE_FORMAT_KEY);
    
    // Layer 2: Interaction Context
    const interactionContext = this.formatInteractionContext(interactionType, context);
    
    // Layer 3: Builder Custom Prompt (from interactionType or parameter)
    const builderPrompt = customPrompt || interactionType.aiPromptTemplate || '';
    
    // Compose final prompt
    const parts = [
      basePrompt,
      sdkContent ? `\n\n## SDK Reference\n${sdkContent}` : '',
      eventHandling ? `\n\n## Event Handling\n${eventHandling}` : '',
      responseFormat ? `\n\n## Response Format\n${responseFormat}` : '',
      `\n\n${interactionContext}`,
      builderPrompt ? `\n\n## Custom Instructions\n${builderPrompt}` : '',
    ].filter(Boolean);
    
    const fullPrompt = parts.join('\n');
    
    this.logger.debug(`Built prompt for interaction ${interactionType.id} (${fullPrompt.length} chars)`);
    
    return fullPrompt;
  }

  /**
   * Get prompt by key from AI prompts table
   */
  private async getPrompt(key: string): Promise<string> {
    try {
      const prompt = await this.aiPromptsService.findByKey(
        this.BASE_PROMPT_ASSISTANT,
        key,
      );
      
      if (prompt) {
        return prompt.content;
      }
      
      return '';
    } catch (error) {
      this.logger.warn(`Error loading prompt ${key}:`, error);
      return '';
    }
  }
  
  /**
   * Get base system prompt from AI prompts table
   */
  private async getBaseSystemPrompt(): Promise<string> {
    const prompt = await this.getPrompt(this.BASE_PROMPT_KEY);
    if (prompt) {
      return prompt;
    }
    
    // Fallback default prompt
    this.logger.warn('Base system prompt not found, using default');
    return this.getDefaultBasePrompt();
  }

  /**
   * Default base prompt if not found in database
   */
  private getDefaultBasePrompt(): string {
    return `You are an AI Teacher assistant helping students learn through interactive activities.

Your role:
- Provide helpful, encouraging guidance
- Explain concepts clearly and simply
- Give hints when students struggle
- Celebrate correct answers
- Guide students toward understanding without giving away answers

Response format:
- Be concise and friendly
- Use age-appropriate language
- Focus on learning, not just correctness
- Ask questions to encourage thinking`;
  }

  /**
   * Format interaction context for prompt
   */
  private formatInteractionContext(
    interactionType: InteractionType,
    context: InteractionContext,
  ): string {
    const processedContent = this.formatProcessedContent(context.processedContent);
    const interactionState = this.formatInteractionState(context.state);
    const recentEvents = this.formatRecentEvents(
      this.interactionContextService.getRecentEvents(context.id),
    );
    
    return `## Interaction Context

**Interaction Type:** ${interactionType.name}
**Interaction ID:** ${interactionType.id}
**Description:** ${interactionType.description}

## Processed Content Data
${processedContent}

## Current Interaction State
${interactionState}

## Recent Events
${recentEvents}`;
  }

  /**
   * Format processed content JSON for prompt
   */
  private formatProcessedContent(content: any): string {
    if (!content) {
      return 'No processed content available.';
    }
    
    try {
      return JSON.stringify(content, null, 2);
    } catch (error) {
      this.logger.warn('Error formatting processed content:', error);
      return 'Processed content available but could not be formatted.';
    }
  }

  /**
   * Format interaction state for prompt
   */
  private formatInteractionState(state: Record<string, any>): string {
    if (!state || Object.keys(state).length === 0) {
      return 'No state data available.';
    }
    
    try {
      return JSON.stringify(state, null, 2);
    } catch (error) {
      this.logger.warn('Error formatting interaction state:', error);
      return 'State data available but could not be formatted.';
    }
  }

  /**
   * Format recent events for prompt
   */
  private formatRecentEvents(events: any[]): string {
    if (!events || events.length === 0) {
      return 'No recent events.';
    }
    
    try {
      const formattedEvents = events.map((event, index) => {
        return `Event ${index + 1}:
- Type: ${event.type}
- Timestamp: ${event.timestamp}
- Data: ${JSON.stringify(event.data, null, 2)}
- Requires LLM Response: ${event.requiresLLMResponse ? 'Yes' : 'No'}`;
      });
      
      return formattedEvents.join('\n\n');
    } catch (error) {
      this.logger.warn('Error formatting recent events:', error);
      return 'Recent events available but could not be formatted.';
    }
  }
}

