import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';

/**
 * Interaction Event - Any string type allowed for flexibility
 */
export interface InteractionEvent {
  type: string; // Any string - no enum restriction
  timestamp: Date;
  data: Record<string, any>;
  requiresLLMResponse: boolean;
  metadata?: {
    category?: 'user-action' | 'system' | 'ai-request' | 'custom';
    priority?: 'low' | 'medium' | 'high';
  };
}

/**
 * Interaction Context - Manages state and events for an interaction
 */
export interface InteractionContext {
  id: string; // Format: lessonId:substageId:interactionId
  lessonId: string;
  substageId: string;
  interactionId: string;
  state: Record<string, any>;
  events: InteractionEvent[];
  processedContent: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interaction AI Context Service
 * Manages interaction state, events, and context for AI Teacher integration
 */
@Injectable()
export class InteractionAIContextService {
  private readonly logger = new Logger(InteractionAIContextService.name);
  
  // In-memory storage for interaction contexts (could be moved to Redis in production)
  private contexts: Map<string, InteractionContext> = new Map();
  
  // Maximum number of events to keep per context
  private readonly MAX_EVENTS = 50;
  
  // Maximum number of recent events to include in prompts
  private readonly RECENT_EVENTS_LIMIT = 10;

  constructor(
    @InjectRepository(ProcessedContentOutput)
    private processedOutputRepository: Repository<ProcessedContentOutput>,
  ) {}

  /**
   * Get or create interaction context
   */
  async getContext(
    lessonId: string,
    substageId: string,
    interactionId: string,
    processedContentId?: string,
  ): Promise<InteractionContext> {
    const contextId = this.generateContextId(lessonId, substageId, interactionId);
    
    let context = this.contexts.get(contextId);
    
    if (!context) {
      // Load processed content if provided
      let processedContent = null;
      if (processedContentId) {
        const processedOutput = await this.processedOutputRepository.findOne({
          where: { id: processedContentId },
        });
        if (processedOutput) {
          processedContent = processedOutput.outputData;
        }
      }
      
      context = {
        id: contextId,
        lessonId,
        substageId,
        interactionId,
        state: {},
        events: [],
        processedContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.contexts.set(contextId, context);
      this.logger.log(`Created new interaction context: ${contextId}`);
    }
    
    return context;
  }

  /**
   * Add event to interaction context
   */
  addEvent(contextId: string, event: InteractionEvent): void {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      this.logger.warn(`Context not found: ${contextId}`);
      return;
    }
    
    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date();
    }
    
    // Add event to context
    context.events.push(event);
    
    // Limit events to MAX_EVENTS (keep most recent)
    if (context.events.length > this.MAX_EVENTS) {
      context.events = context.events.slice(-this.MAX_EVENTS);
    }
    
    context.updatedAt = new Date();
    
    this.logger.debug(`Added event ${event.type} to context ${contextId}`);
  }

  /**
   * Update interaction state
   */
  updateState(contextId: string, updates: Record<string, any>): void {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      this.logger.warn(`Context not found: ${contextId}`);
      return;
    }
    
    // Merge updates into state
    context.state = {
      ...context.state,
      ...updates,
    };
    
    context.updatedAt = new Date();
    
    this.logger.debug(`Updated state for context ${contextId}`);
  }

  /**
   * Get recent events (last N events)
   */
  getRecentEvents(contextId: string, limit: number = this.RECENT_EVENTS_LIMIT): InteractionEvent[] {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      return [];
    }
    
    return context.events.slice(-limit);
  }

  /**
   * Get full context for prompt building
   */
  async getContextForPrompt(
    lessonId: string,
    substageId: string,
    interactionId: string,
    processedContentId?: string,
  ): Promise<InteractionContext> {
    return this.getContext(lessonId, substageId, interactionId, processedContentId);
  }

  /**
   * Clear context (useful for cleanup)
   */
  clearContext(contextId: string): void {
    this.contexts.delete(contextId);
    this.logger.log(`Cleared context: ${contextId}`);
  }

  /**
   * Generate context ID
   */
  private generateContextId(lessonId: string, substageId: string, interactionId: string): string {
    return `${lessonId}:${substageId}:${interactionId}`;
  }
}

