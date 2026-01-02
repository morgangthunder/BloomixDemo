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
        this.handleIframeMessage(event.data, event);
      }
    });
  }

  /**
   * Handle messages from iframes
   */
  private handleIframeMessage(message: any, event?: MessageEvent): void {
    const sourceWindow = event?.source as Window || window;
    
    if (!this.initialized) {
      this.sendToIframe(sourceWindow, {
        type: 'ai-sdk-error',
        error: 'AI SDK not initialized',
        requestId: message.requestId,
      });
      return;
    }

    switch (message.type) {
      case 'ai-sdk-emit-event':
        this.aiSDK.emitEvent(message.event, message.processedContentId);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-event-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-update-state':
        this.aiSDK.updateState(message.key, message.value);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-state-updated',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-get-state':
        const state = this.aiSDK.getState();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-state',
          state,
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-subscribe':
        // Subscribe to AI responses and forward them to iframe
        const subscription = this.aiSDK.onResponse((response) => {
          this.sendToIframe(sourceWindow, {
            type: 'ai-sdk-response',
            response,
            subscriptionId: message.subscriptionId,
          });
        });
        const unsubscribeFn = () => subscription.unsubscribe();
        this.messageHandlers.set(message.subscriptionId, unsubscribeFn);
        this.sendToIframe(sourceWindow, {
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
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-unsubscribed',
          subscriptionId: message.subscriptionId,
          requestId: message.requestId,
        });
        break;

      // UI Control Methods
      case 'ai-sdk-minimize-chat-ui':
        this.aiSDK.minimizeChatUI();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-minimize-chat-ui-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-show-chat-ui':
        this.aiSDK.showChatUI();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-show-chat-ui-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-activate-fullscreen':
        this.aiSDK.activateFullscreen();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-activate-fullscreen-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-deactivate-fullscreen':
        this.aiSDK.deactivateFullscreen();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-deactivate-fullscreen-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-post-to-chat':
        this.aiSDK.postToChat(message.content, message.role || 'assistant', message.openChat || false);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-post-to-chat-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-show-script':
        this.aiSDK.showScript(message.text, message.openChat || false);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-show-script-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-show-snack':
        const snackId = this.aiSDK.showSnack(message.content, message.duration, message.hideFromChatUI || false);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-show-snack-ack',
          snackId,
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-hide-snack':
        this.aiSDK.hideSnack();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-hide-snack-ack',
          requestId: message.requestId,
        });
        break;

      // Data Storage Methods
      case 'ai-sdk-save-instance-data':
        this.aiSDK.saveInstanceData(message.data)
          .then(() => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-save-instance-data-ack',
              success: true,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-save-instance-data-ack',
              success: false,
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-get-instance-data-history':
        this.aiSDK.getInstanceDataHistory(message.filters)
          .then((data) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-instance-data-history-ack',
              data,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-instance-data-history-ack',
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-save-user-progress':
        this.aiSDK.saveUserProgress(message.data)
          .then((progress) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-save-user-progress-ack',
              progress,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-save-user-progress-ack',
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-get-user-progress':
        this.aiSDK.getUserProgress()
          .then((progress) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-user-progress-ack',
              progress,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-user-progress-ack',
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-mark-completed':
        this.aiSDK.markCompleted()
          .then((progress) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-mark-completed-ack',
              progress,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-mark-completed-ack',
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-increment-attempts':
        this.aiSDK.incrementAttempts()
          .then((progress) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-increment-attempts-ack',
              progress,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-increment-attempts-ack',
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-get-user-public-profile':
        this.aiSDK.getUserPublicProfile(message.userId)
          .then((profile) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-user-public-profile-ack',
              profile,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-user-public-profile-ack',
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-generate-image':
        this.aiSDK.generateImage(message.options || {})
          .then((response) => {
            console.log('[InteractionAIBridge] generateImage response keys:', Object.keys(response || {}));
            console.log('[InteractionAIBridge] generateImage response.imageId:', response?.imageId);
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-generate-image-ack',
              ...response,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-generate-image-ack',
              success: false,
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-get-lesson-images':
        this.aiSDK.getLessonImages(message.lessonId, message.accountId, message.imageId)
          .then((images) => {
            // getLessonImages returns an array directly
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-lesson-images-ack',
              images: images || [],
              success: true,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-lesson-images-ack',
              images: [],
              success: false,
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-get-lesson-image-ids':
        this.aiSDK.getLessonImageIds(message.lessonId, message.accountId)
          .then((imageIds) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-lesson-image-ids-ack',
              imageIds: imageIds || [],
              success: true,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-get-lesson-image-ids-ack',
              imageIds: [],
              success: false,
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      // Media Control Methods (for uploaded-media interactions)
      case 'ai-sdk-play-media':
        this.aiSDK.playMedia()
          .then(() => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-play-media-ack',
              success: true,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-play-media-ack',
              success: false,
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-pause-media':
        this.aiSDK.pauseMedia();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-pause-media-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-seek-media':
        this.aiSDK.seekMedia(message.time);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-seek-media-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-set-media-volume':
        this.aiSDK.setMediaVolume(message.volume);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-set-media-volume-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-get-media-current-time':
        const currentTime = this.aiSDK.getMediaCurrentTime();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-get-media-current-time-ack',
          currentTime,
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-get-media-duration':
        const duration = this.aiSDK.getMediaDuration();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-get-media-duration-ack',
          duration,
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-is-media-playing':
        const isPlaying = this.aiSDK.isMediaPlaying();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-is-media-playing-ack',
          isPlaying,
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-show-overlay-html':
        this.aiSDK.showOverlayHtml();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-show-overlay-html-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-hide-overlay-html':
        console.log('[AIBridge] 📢 Received ai-sdk-hide-overlay-html message');
        this.aiSDK.hideOverlayHtml();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-hide-overlay-html-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-show-overlay-html-ack':
      case 'ai-sdk-hide-overlay-html-ack':
      case 'ai-sdk-pause-media-ack':
      case 'ai-sdk-play-media-ack':
      case 'ai-sdk-seek-media-ack':
      case 'ai-sdk-set-media-volume-ack':
        // Acknowledgment messages - no action needed, just log
        console.log('[AIBridge] ✅ Received acknowledgment:', message.type);
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

    /**
     * UI Control Methods
     */
    minimizeChatUI: () => {
      sendMessage('ai-sdk-minimize-chat-ui', {});
    },

    showChatUI: () => {
      sendMessage('ai-sdk-show-chat-ui', {});
    },

    activateFullscreen: () => {
      sendMessage('ai-sdk-activate-fullscreen', {});
    },

    deactivateFullscreen: () => {
      sendMessage('ai-sdk-deactivate-fullscreen', {});
    },

    postToChat: (content: string, role: 'user' | 'assistant' | 'error' = 'assistant', openChat: boolean = false) => {
      sendMessage('ai-sdk-post-to-chat', { content, role, openChat });
    },

    showScript: (text: string, openChat: boolean = false) => {
      sendMessage('ai-sdk-show-script', { text, openChat });
    },

    showSnack: (content: string, duration?: number, hideFromChatUI: boolean = false, callback?: (snackId: string) => void) => {
      sendMessage('ai-sdk-show-snack', { content, duration, hideFromChatUI }, (response) => {
        if (callback && response.snackId) {
          callback(response.snackId);
        }
      });
    },

    hideSnack: () => {
      sendMessage('ai-sdk-hide-snack', {});
    },

    /**
     * Data Storage Methods
     */
    saveInstanceData: (data: Record<string, any>, callback?: (success: boolean, error?: string) => void) => {
      sendMessage('ai-sdk-save-instance-data', { data }, (response) => {
        if (callback) {
          callback(response.success, response.error);
        }
      });
    },

    getInstanceDataHistory: (filters?: { dateFrom?: Date; dateTo?: Date; limit?: number }, callback?: (data: any[] | null, error?: string) => void) => {
      const filtersData = filters ? {
        dateFrom: filters.dateFrom?.toISOString(),
        dateTo: filters.dateTo?.toISOString(),
        limit: filters.limit,
      } : {};
      sendMessage('ai-sdk-get-instance-data-history', { filters: filtersData }, (response) => {
        if (callback) {
          callback(response.data, response.error);
        }
      });
    },

    saveUserProgress: (data: { score?: number; timeTakenSeconds?: number; interactionEvents?: any[]; customData?: Record<string, any>; completed?: boolean }, callback?: (progress: any | null, error?: string) => void) => {
      sendMessage('ai-sdk-save-user-progress', { data }, (response) => {
        if (callback) {
          callback(response.progress, response.error);
        }
      });
    },

    getUserProgress: (callback?: (progress: any | null, error?: string) => void) => {
      sendMessage('ai-sdk-get-user-progress', {}, (response) => {
        if (callback) {
          callback(response.progress, response.error);
        }
      });
    },

    markCompleted: (callback?: (progress: any | null, error?: string) => void) => {
      sendMessage('ai-sdk-mark-completed', {}, (response) => {
        if (callback) {
          callback(response.progress, response.error);
        }
      });
    },

    incrementAttempts: (callback?: (progress: any | null, error?: string) => void) => {
      sendMessage('ai-sdk-increment-attempts', {}, (response) => {
        if (callback) {
          callback(response.progress, response.error);
        }
      });
    },

    getUserPublicProfile: (userId?: string, callback?: (profile: any | null, error?: string) => void) => {
      sendMessage('ai-sdk-get-user-public-profile', { userId }, (response) => {
        if (callback) {
          callback(response.profile, response.error);
        }
      });
    },

    generateImage: (options: { prompt: string; userInput?: string; screenshot?: string; customInstructions?: string }, callback?: (response: any) => void) => {
      sendMessage('ai-sdk-generate-image', { options }, (response) => {
        if (callback) {
          callback(response);
        }
      });
    },
  };
};

