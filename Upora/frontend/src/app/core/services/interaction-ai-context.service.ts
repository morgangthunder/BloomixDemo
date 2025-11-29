import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { environment } from '../../../environments/environment';

/**
 * Interaction Event - Any string type allowed for flexibility
 */
export interface InteractionEvent {
  type: string; // Any string - no enum restriction
  timestamp?: Date;
  data: Record<string, any>;
  requiresLLMResponse: boolean;
  metadata?: {
    category?: 'user-action' | 'system' | 'ai-request' | 'custom';
    priority?: 'low' | 'medium' | 'high';
  };
}

/**
 * Response Action - Actions that can be executed in the interaction
 */
export interface ResponseAction {
  type: string; // 'highlight', 'show-hint', 'update-ui', 'play-sound', 'custom', etc.
  target: string; // Element ID, fragment index, etc.
  data: any;
}

/**
 * LLM Response - Structured response from AI Teacher
 */
export interface LLMResponse {
  response: string; // Main text response
  actions?: ResponseAction[];
  stateUpdates?: Record<string, any>;
  metadata?: {
    confidence?: number;
    suggestedNextStep?: string;
    // Display configuration
    showInSnack?: boolean; // Show in snack message
    snackDuration?: number; // Duration in milliseconds (undefined = until manually closed)
    postToChat?: boolean; // Post to chat UI
    openChatUI?: boolean; // Open/restore chat UI if minimized
    showAsScript?: boolean; // Show as script block instead of chat message
  };
}

/**
 * Interaction AI Response Event
 */
export interface InteractionAIResponseEvent {
  interactionId: string;
  substageId: string;
  response: LLMResponse;
  timestamp: Date;
  error?: boolean;
}

/**
 * Interaction AI Context Service (Frontend)
 * Manages interaction state, events, and AI responses
 */
@Injectable({
  providedIn: 'root',
})
export class InteractionAIContextService {
  private currentContext: {
    lessonId: string;
    substageId: string;
    interactionId: string;
    state: Record<string, any>;
  } | null = null;

  private responseSubject = new Subject<InteractionAIResponseEvent>();
  private actionSubject = new Subject<{ interactionId: string; action: ResponseAction }>();

  // Observables
  response$: Observable<InteractionAIResponseEvent> = this.responseSubject.asObservable();
  action$: Observable<{ interactionId: string; action: ResponseAction }> = this.actionSubject.asObservable();

  constructor(private websocketService: WebSocketService) {
    // Subscribe to WebSocket interaction-ai-response events
    // Note: This assumes WebSocketService exposes a way to listen to custom events
    // We'll need to extend WebSocketService or use a different approach
    this.setupWebSocketListeners();
  }

  /**
   * Initialize context for an interaction
   */
  initializeContext(
    lessonId: string,
    substageId: string,
    interactionId: string,
    processedContentId?: string,
  ): void {
    this.currentContext = {
      lessonId,
      substageId,
      interactionId,
      state: {
        processedContentId,
      },
    };
  }

  /**
   * Emit an event that may trigger LLM query
   */
  emitEvent(
    event: InteractionEvent,
    processedContentId?: string,
  ): void {
    if (!this.currentContext) {
      console.warn('[InteractionAIContext] No context initialized, cannot emit event');
      return;
    }

    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Emit event via WebSocket
    this.websocketService.emitCustomEvent('interaction-event', {
      lessonId: this.currentContext.lessonId,
      substageId: this.currentContext.substageId,
      interactionId: this.currentContext.interactionId,
      event,
      currentState: this.currentContext.state,
      processedContentId,
      userId: environment.defaultUserId,
      tenantId: environment.tenantId,
    });

    console.log('[InteractionAIContext] Emitted event:', event.type);
  }

  /**
   * Get current interaction state
   */
  getState(): Record<string, any> {
    return this.currentContext?.state || {};
  }

  /**
   * Update interaction state
   */
  updateState(key: string, value: any): void {
    if (!this.currentContext) {
      console.warn('[InteractionAIContext] No context initialized, cannot update state');
      return;
    }

    this.currentContext.state[key] = value;
  }

  /**
   * Subscribe to LLM responses
   */
  onResponse(callback: (response: InteractionAIResponseEvent) => void): () => void {
    const subscription = this.response$.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  /**
   * Subscribe to specific action types
   */
  onAction(
    actionType: string,
    callback: (action: ResponseAction) => void,
  ): () => void {
    const subscription = this.action$.subscribe(({ interactionId, action }) => {
      if (action.type === actionType && interactionId === this.currentContext?.interactionId) {
        callback(action);
      }
    });
    return () => subscription.unsubscribe();
  }

  /**
   * Request immediate AI response (for explicit user requests)
   */
  async requestAIResponse(prompt?: string): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('AI response timeout'));
      }, 30000);

      const subscription = this.response$.subscribe((event) => {
        clearTimeout(timeout);
        subscription.unsubscribe();
        resolve(event.response);
      });

      // Emit a request event
      this.emitEvent({
        type: 'ai-request',
        data: { prompt: prompt || 'Please provide guidance' },
        requiresLLMResponse: true,
      });
    });
  }

  /**
   * Clear current context
   */
  clearContext(): void {
    this.currentContext = null;
  }

  /**
   * Setup WebSocket listeners for interaction AI responses
   */
  private setupWebSocketListeners(): void {
    // Subscribe to interaction AI responses via WebSocketService observable
    this.websocketService.interactionAIResponse$.subscribe((data: InteractionAIResponseEvent | null) => {
      if (!data) return;

      console.log('[InteractionAIContext] Received AI response:', data);
      this.responseSubject.next(data);

      // Execute actions if present
      if (data.response.actions) {
        data.response.actions.forEach((action) => {
          this.actionSubject.next({
            interactionId: data.interactionId,
            action,
          });
        });
      }

      // Update state if response includes state updates
      if (data.response.stateUpdates) {
        Object.entries(data.response.stateUpdates).forEach(([key, value]) => {
          this.updateState(key, value);
        });
      }
    });
  }
}

