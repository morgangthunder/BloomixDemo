import { Injectable, inject } from '@angular/core';
import { InteractionAISDK, StandardEventTypes } from './interaction-ai-sdk.service';

/**
 * Interaction AI Helper Service
 * Provides a simplified interface for HTML, PixiJS, and iframe interactions
 * to integrate with the AI Teacher SDK without needing to inject the SDK directly
 */
@Injectable({
  providedIn: 'root',
})
export class InteractionAIHelperService {
  private aiSDK = inject(InteractionAISDK);

  /**
   * Get the SDK instance (for advanced usage)
   */
  getSDK(): InteractionAISDK {
    return this.aiSDK;
  }

  /**
   * Emit a user action event
   */
  emitUserAction(actionType: string, data: Record<string, any>, requiresResponse: boolean = true): void {
    this.aiSDK.emitEvent({
      type: actionType,
      data,
      requiresLLMResponse: requiresResponse,
      metadata: {
        category: 'user-action',
        priority: 'medium',
      },
    });
  }

  /**
   * Emit a progress update
   */
  emitProgress(progress: number, data?: Record<string, any>): void {
    this.aiSDK.emitEvent({
      type: StandardEventTypes.PROGRESS_UPDATE,
      data: {
        progress,
        ...data,
      },
      requiresLLMResponse: false,
      metadata: {
        category: 'system',
        priority: 'low',
      },
    });
  }

  /**
   * Emit a score change
   */
  emitScoreChange(score: number, maxScore: number, data?: Record<string, any>): void {
    this.aiSDK.emitEvent({
      type: StandardEventTypes.SCORE_CHANGE,
      data: {
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
        ...data,
      },
      requiresLLMResponse: true,
      metadata: {
        category: 'system',
        priority: 'high',
      },
    });
  }

  /**
   * Request a hint
   */
  requestHint(context?: string): void {
    this.aiSDK.emitEvent({
      type: StandardEventTypes.HINT_REQUEST,
      data: {
        context: context || 'General hint needed',
      },
      requiresLLMResponse: true,
      metadata: {
        category: 'ai-request',
        priority: 'high',
      },
    });
  }

  /**
   * Request an explanation
   */
  requestExplanation(topic: string, data?: Record<string, any>): void {
    this.aiSDK.emitEvent({
      type: StandardEventTypes.EXPLANATION_REQUEST,
      data: {
        topic,
        ...data,
      },
      requiresLLMResponse: true,
      metadata: {
        category: 'ai-request',
        priority: 'high',
      },
    });
  }

  /**
   * Subscribe to AI responses (simplified)
   */
  onAIResponse(callback: (response: string, actions?: any[]) => void): () => void {
    const subscription = this.aiSDK.onResponse((llmResponse) => {
      callback(llmResponse.response, llmResponse.actions);
    });
    return () => subscription.unsubscribe();
  }

  /**
   * Subscribe to specific action types
   */
  onAction(actionType: string, callback: (action: any) => void): () => void {
    const subscription = this.aiSDK.onAction(actionType, callback);
    return () => subscription.unsubscribe();
  }

  /**
   * Update interaction state
   */
  updateState(key: string, value: any): void {
    this.aiSDK.updateState(key, value);
  }

  /**
   * Get current state
   */
  getState(): Record<string, any> {
    return this.aiSDK.getState();
  }
}

