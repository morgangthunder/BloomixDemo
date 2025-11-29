import { Injectable, inject } from '@angular/core';
import { Observable, Subscription, Subscriber } from 'rxjs';
import {
  InteractionAIContextService,
  InteractionEvent,
  LLMResponse,
  ResponseAction,
  InteractionAIResponseEvent,
} from './interaction-ai-context.service';
import { SnackMessageService } from './snack-message.service';

/**
 * Standard Event Types (suggestions, not requirements)
 */
export const StandardEventTypes = {
  // User actions
  USER_SELECTION: 'user-selection',
  USER_INPUT: 'user-input',
  PROGRESS_UPDATE: 'progress-update',
  SCORE_CHANGE: 'score-change',

  // AI requests
  HINT_REQUEST: 'hint-request',
  EXPLANATION_REQUEST: 'explanation-request',
  ENCOURAGEMENT_REQUEST: 'encouragement-request',
  CORRECTION_REQUEST: 'correction-request',

  // Interaction lifecycle
  INTERACTION_STARTED: 'interaction-started',
  INTERACTION_COMPLETED: 'interaction-completed',
  INTERACTION_PAUSED: 'interaction-paused',
} as const;

/**
 * Interaction AI SDK
 * Simple interface for interaction builders to integrate with AI Teacher
 */
@Injectable({
  providedIn: 'root',
})
export class InteractionAISDK {
  private snackService = inject(SnackMessageService);
  private teacherWidgetRef: any = null; // Reference to FloatingTeacherWidgetComponent

  constructor(private contextService: InteractionAIContextService) {}

  /**
   * Set reference to teacher widget for posting messages
   * Called by lesson-view component
   */
  setTeacherWidgetRef(widget: any): void {
    this.teacherWidgetRef = widget;
  }

  /**
   * Initialize SDK for an interaction
   */
  initialize(lessonId: string, substageId: string, interactionId: string, processedContentId?: string): void {
    this.contextService.initializeContext(lessonId, substageId, interactionId, processedContentId);
  }

  /**
   * Emit an event that may trigger LLM query
   */
  emitEvent(event: InteractionEvent, processedContentId?: string): void {
    this.contextService.emitEvent(event, processedContentId);
  }

  /**
   * Get current interaction state
   */
  getState(): Record<string, any> {
    return this.contextService.getState();
  }

  /**
   * Update interaction state
   */
  updateState(key: string, value: any): void {
    this.contextService.updateState(key, value);
  }

  /**
   * Subscribe to LLM responses
   */
  onResponse(callback: (response: LLMResponse) => void): Subscription {
    const unsubscribe = this.contextService.onResponse((event) => {
      const response = event.response;
      
      // Handle display configuration from response metadata
      if (response.metadata) {
        // Show in snack if configured
        if (response.metadata.showInSnack) {
          this.showSnack(response.response, response.metadata.snackDuration);
        }
        
        // Post to chat if configured
        if (response.metadata.postToChat || !response.metadata.showInSnack) {
          // Default to posting to chat if not showing in snack
          this.postToChat(response.response, 'assistant', response.metadata.openChatUI);
        }
        
        // Show as script if configured
        if (response.metadata.showAsScript) {
          this.showScript(response.response, response.metadata.openChatUI);
        }
      } else {
        // Default behavior: post to chat
        this.postToChat(response.response, 'assistant', false);
      }
      
      callback(response);
    });
    return new Subscription(unsubscribe);
  }

  /**
   * Subscribe to specific action types
   */
  onAction(actionType: string, callback: (action: ResponseAction) => void): Subscription {
    const unsubscribe = this.contextService.onAction(actionType, callback);
    return new Subscription(unsubscribe);
  }

  /**
   * Request immediate AI response (for explicit user requests)
   */
  async requestAIResponse(prompt?: string): Promise<LLMResponse> {
    return this.contextService.requestAIResponse(prompt);
  }

  /**
   * Clear context (cleanup)
   */
  clearContext(): void {
    this.contextService.clearContext();
  }

  /**
   * Minimize the chat UI
   */
  minimizeChatUI(): void {
    if (this.teacherWidgetRef) {
      this.teacherWidgetRef.minimize();
      console.log('[InteractionAISDK] ✅ Minimized chat UI');
    } else {
      console.warn('[InteractionAISDK] ⚠️ Teacher widget reference not available');
    }
  }

  /**
   * Activate fullscreen mode
   */
  activateFullscreen(): void {
    // Access the lesson view component through a service or event
    // For now, we'll use a custom event that the lesson view can listen to
    const event = new CustomEvent('interaction-request-fullscreen', {
      detail: { source: 'interaction-sdk' }
    });
    window.dispatchEvent(event);
    console.log('[InteractionAISDK] ✅ Dispatched fullscreen activation event');
  }

  /**
   * Post a message to the AI Teacher chat UI
   * @param content Message text
   * @param role Message role ('user' | 'assistant' | 'error')
   * @param openChat If true, opens/restores the chat widget if minimized
   */
  postToChat(content: string, role: 'user' | 'assistant' | 'error' = 'assistant', openChat: boolean = false): void {
    if (this.teacherWidgetRef) {
      if (openChat) {
        this.teacherWidgetRef.openWidget();
      }
      this.teacherWidgetRef.addChatMessage(content, role);
    } else {
      console.warn('[InteractionAISDK] Teacher widget reference not set, cannot post to chat');
    }
  }

  /**
   * Show a script block in the teacher widget
   * @param text Script text to display
   * @param openChat If true, opens/restores the chat widget if minimized
   */
  showScript(text: string, openChat: boolean = false): void {
    if (this.teacherWidgetRef) {
      if (openChat) {
        this.teacherWidgetRef.openWidget();
      }
      this.teacherWidgetRef.showScript(text);
    } else {
      console.warn('[InteractionAISDK] Teacher widget reference not set, cannot show script');
    }
  }

  /**
   * Show a snack message (temporary notification)
   * @param content Message text
   * @param duration Duration in milliseconds (undefined = until manually closed or replaced)
   */
  showSnack(content: string, duration?: number): string {
    return this.snackService.show(content, duration);
  }

  /**
   * Hide current snack message
   */
  hideSnack(): void {
    this.snackService.hide();
  }
}

