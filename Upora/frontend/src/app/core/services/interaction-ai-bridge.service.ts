import { Injectable, inject } from '@angular/core';
import { InteractionAISDK } from './interaction-ai-sdk.service';

/**
 * Interaction AI Bridge Service
 * Provides postMessage communication for iframe-based interactions (HTML, PixiJS, iframe)
 * to access the AI Teacher SDK from within sandboxed iframes
 */
@Injectable({
  providedIn: 'root',
})
export class InteractionAIBridgeService {
  private aiSDK = inject(InteractionAISDK);
  private messageHandlers: Map<string, () => void> = new Map();
  private initialized = false;

  constructor() {
    this.setupMessageListener();
  }

  /**
   * Initialize the bridge (called by lesson-view when an interaction is active)
   */
  initialize(lessonId: string, substageId: string, interactionId: string, processedContentId?: string): void {
    this.aiSDK.initialize(lessonId, substageId, interactionId, processedContentId);
    this.initialized = true;
    this.broadcastToIframes({ type: 'ai-sdk-ready', lessonId, substageId, interactionId });
  }

  /**
   * Destroy the bridge (called when interaction is no longer active)
   */
  destroy(): void {
    this.aiSDK.clearContext();
    this.initialized = false;
    this.messageHandlers.clear();
    this.broadcastToIframes({ type: 'ai-sdk-destroyed' });
  }

  /**
   * Setup message listener for postMessage from iframes
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Security: Only accept messages from same origin or trusted sources
      // In production, you might want to validate event.origin
      if (event.data && event.data.type && event.data.type.startsWith('ai-sdk-')) {
        this.handleIframeMessage(event.data);
      }
    });
  }

  /**
   * Handle messages from iframes
   */
  private handleIframeMessage(message: any): void {
    if (!this.initialized) {
      this.sendToIframe(message.sourceWindow || window, {
        type: 'ai-sdk-error',
        error: 'AI SDK not initialized',
        requestId: message.requestId,
      });
      return;
    }

    switch (message.type) {
      case 'ai-sdk-emit-event':
        this.aiSDK.emitEvent(message.event, message.processedContentId);
        this.sendToIframe(message.sourceWindow || window, {
          type: 'ai-sdk-event-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-update-state':
        this.aiSDK.updateState(message.key, message.value);
        this.sendToIframe(message.sourceWindow || window, {
          type: 'ai-sdk-state-updated',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-get-state':
        const state = this.aiSDK.getState();
        this.sendToIframe(message.sourceWindow || window, {
          type: 'ai-sdk-state',
          state,
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-subscribe':
        // Subscribe to AI responses and forward them to iframe
        const subscription = this.aiSDK.onResponse((response) => {
          this.sendToIframe(message.sourceWindow || window, {
            type: 'ai-sdk-response',
            response,
            subscriptionId: message.subscriptionId,
          });
        });
        const unsubscribeFn = () => subscription.unsubscribe();
        this.messageHandlers.set(message.subscriptionId, unsubscribeFn);
        this.sendToIframe(message.sourceWindow || window, {
          type: 'ai-sdk-subscribed',
          subscriptionId: message.subscriptionId,
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-unsubscribe':
        const handler = this.messageHandlers.get(message.subscriptionId);
        if (handler) {
          handler(); // Unsubscribe function takes no arguments
          this.messageHandlers.delete(message.subscriptionId);
        }
        this.sendToIframe(message.sourceWindow || window, {
          type: 'ai-sdk-unsubscribed',
          subscriptionId: message.subscriptionId,
          requestId: message.requestId,
        });
        break;

      default:
        console.warn('[AIBridge] Unknown message type:', message.type);
    }
  }

  /**
   * Send message to iframe
   */
  private sendToIframe(targetWindow: Window, message: any): void {
    // In a real implementation, you'd need to track which iframe sent the message
    // For now, we'll broadcast to all iframes (or use a more sophisticated targeting)
    targetWindow.postMessage(message, '*'); // Use specific origin in production
  }

  /**
   * Broadcast message to all iframes (for initialization, etc.)
   */
  private broadcastToIframes(message: any): void {
    // Find all iframes in the document
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(message, '*'); // Use specific origin in production
      }
    });
  }
}

/**
 * Client-side SDK for iframe interactions
 * Include this in HTML/PixiJS interaction code to access AI Teacher
 */
export const createIframeAISDK = () => {
  let subscriptionId: string | null = null;
  let requestCounter = 0;

  const generateRequestId = () => `req-${Date.now()}-${++requestCounter}`;
  const generateSubscriptionId = () => `sub-${Date.now()}-${Math.random()}`;

  const sendMessage = (type: string, data: any, callback?: (response: any) => void) => {
    const requestId = generateRequestId();
    const message = { type, requestId, ...data, sourceWindow: window };

    if (callback) {
      const listener = (event: MessageEvent) => {
        if (event.data.requestId === requestId) {
          window.removeEventListener('message', listener);
          callback(event.data);
        }
      };
      window.addEventListener('message', listener);
    }

    window.parent.postMessage(message, '*'); // Use specific origin in production
  };

  return {
    /**
     * Emit an event to the AI Teacher
     */
    emitEvent: (event: any, processedContentId?: string) => {
      sendMessage('ai-sdk-emit-event', { event, processedContentId });
    },

    /**
     * Update interaction state
     */
    updateState: (key: string, value: any) => {
      sendMessage('ai-sdk-update-state', { key, value });
    },

    /**
     * Get current state
     */
    getState: (callback: (state: any) => void) => {
      sendMessage('ai-sdk-get-state', {}, (response) => {
        callback(response.state);
      });
    },

    /**
     * Subscribe to AI responses
     */
    onResponse: (callback: (response: any) => void) => {
      subscriptionId = generateSubscriptionId();
      sendMessage('ai-sdk-subscribe', { subscriptionId }, () => {
        const listener = (event: MessageEvent) => {
          if (event.data.type === 'ai-sdk-response' && event.data.subscriptionId === subscriptionId) {
            callback(event.data.response);
          }
        };
        window.addEventListener('message', listener);

        return () => {
          window.removeEventListener('message', listener);
          sendMessage('ai-sdk-unsubscribe', { subscriptionId });
        };
      });
    },

    /**
     * Check if SDK is ready
     */
    isReady: (callback: (ready: boolean) => void) => {
      const listener = (event: MessageEvent) => {
        if (event.data.type === 'ai-sdk-ready') {
          window.removeEventListener('message', listener);
          callback(true);
        }
      };
      window.addEventListener('message', listener);
    },
  };
};

