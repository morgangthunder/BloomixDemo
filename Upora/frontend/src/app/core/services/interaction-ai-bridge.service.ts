import { Injectable, inject } from '@angular/core';
import { InteractionAISDK } from './interaction-ai-sdk.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

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
  private authService = inject(AuthService);
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
        const snackId = this.aiSDK.showSnack(message.content, message.duration, message.hideFromChatUI || false, message.actions);
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
        // Ensure SDK uses actual logged-in user (auth interceptor also adds header, but refresh for consistency)
        const currentUser = this.authService.currentUser();
        const userId = currentUser?.userId || environment.defaultUserId;
        const tenantId = currentUser?.tenantId || environment.tenantId;
        
        // Extract data object - message.data should contain { score, completed, ... }
        // The iframe SDK sends: { type: 'ai-sdk-save-user-progress', data: { score: 66, completed: true }, ... }
        const progressData = message.data || {};
        
        // Validate and sanitize score - only include if it's a valid number (including 0)
        let scoreToSave: number | undefined = undefined;
        if (progressData.score !== undefined && progressData.score !== null) {
          const numScore = Number(progressData.score);
          if (!isNaN(numScore) && isFinite(numScore)) {
            // Valid number (including 0) - round to 2 decimal places
            scoreToSave = Math.round(numScore * 100) / 100;
          } else {
            console.warn('[Bridge] ⚠️ Invalid score value:', progressData.score, 'omitting from payload');
          }
        }
        
        // Only include score in sanitizedData if it's a valid number
        const sanitizedData: any = {
          ...progressData,
        };
        if (scoreToSave !== undefined) {
          sanitizedData.score = scoreToSave;
        } else {
          // Explicitly remove score if invalid to ensure it's not sent
          delete sanitizedData.score;
        }
        
        console.log('[Bridge] 📨 ai-sdk-save-user-progress received:', {
          messageType: message.type,
          originalData: progressData,
          sanitizedData: sanitizedData,
          dataKeys: progressData ? Object.keys(progressData) : [],
          originalScore: progressData.score,
          sanitizedScore: sanitizedData.score,
          scoreType: typeof sanitizedData.score,
          hasScore: sanitizedData.score !== undefined && sanitizedData.score !== null,
          completed: sanitizedData.completed,
          _userId: userId,
          _tenantId: tenantId,
          fullMessageKeys: Object.keys(message),
        });
        this.aiSDK.refreshUserContext(userId, tenantId);
        this.aiSDK.saveUserProgress(sanitizedData)
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
        const gpUser = this.authService.currentUser();
        this.aiSDK.refreshUserContext(gpUser?.userId || environment.defaultUserId, gpUser?.tenantId || environment.tenantId);
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
        const mcUser = this.authService.currentUser();
        this.aiSDK.refreshUserContext(mcUser?.userId || environment.defaultUserId, mcUser?.tenantId || environment.tenantId);
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
        const iaUser = this.authService.currentUser();
        this.aiSDK.refreshUserContext(iaUser?.userId || environment.defaultUserId, iaUser?.tenantId || environment.tenantId);
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

      case 'ai-sdk-select-theme':
        this.aiSDK.selectBestTheme(message.options || {})
          .then((response) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-select-theme-ack',
              ...response,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-select-theme-ack',
              theme: 'Studio Ghibli',
              source: 'fallback',
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-complete-interaction':
        // Dispatch custom event to trigger lesson progression
        window.dispatchEvent(new CustomEvent('interaction-request-progress'));
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-complete-interaction-ack',
          requestId: message.requestId,
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

      case 'ai-sdk-find-image-pair':
        this.aiSDK.findImagePair(message.options || {})
          .then((result) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-find-image-pair-ack',
              ...result,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-find-image-pair-ack',
              found: false,
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      case 'ai-sdk-delete-image':
        this.aiSDK.deleteImage(message.imageId)
          .then((result) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-delete-image-ack',
              success: result.success,
              error: result.error,
              requestId: message.requestId,
            });
          })
          .catch((error) => {
            this.sendToIframe(sourceWindow, {
              type: 'ai-sdk-delete-image-ack',
              success: false,
              error: error.message,
              requestId: message.requestId,
            });
          });
        break;

      // ── Cross-Interaction Navigation ──────────────────────────────
      case 'ai-sdk-navigate-to-substage':
        this.aiSDK.navigateToSubstage(message.stageId, message.substageId);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-navigate-to-substage-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-get-lesson-structure':
        const structure = this.aiSDK.getLessonStructure();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-get-lesson-structure-ack',
          structure,
          requestId: message.requestId,
        });
        break;

      // ── Shared Lesson Data ────────────────────────────────────────
      case 'ai-sdk-set-shared-data':
        this.aiSDK.setSharedData(message.key, message.value);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-set-shared-data-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-get-shared-data':
        const sharedValue = this.aiSDK.getSharedData(message.key);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-get-shared-data-ack',
          value: sharedValue,
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-get-all-shared-data':
        const allShared = this.aiSDK.getAllSharedData();
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-get-all-shared-data-ack',
          data: allShared,
          requestId: message.requestId,
        });
        break;

      // ── Prefetch Results ──────────────────────────────────────────
      case 'ai-sdk-get-prefetch-result':
        const prefetch = this.aiSDK.getCurrentPrefetchResult(message.key);
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-get-prefetch-result-ack',
          result: prefetch?.data ?? null,
          status: prefetch?.status ?? 'none',
          error: prefetch?.error,
          requestId: message.requestId,
        });
        break;

      // ── Cross-Lesson Navigation & Data ────────────────────────────
      case 'ai-sdk-navigate-to-lesson':
        this.aiSDK.navigateToLesson(message.lessonId, message.options || {});
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-navigate-to-lesson-ack',
          requestId: message.requestId,
        });
        break;

      case 'ai-sdk-set-cross-lesson-data':
        this.aiSDK.storeCrossLessonData(message.targetLessonId, message.data || {});
        this.sendToIframe(sourceWindow, {
          type: 'ai-sdk-set-cross-lesson-data-ack',
          requestId: message.requestId,
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

      case 'ai-sdk-content-overflow':
        console.log('[AIBridge] Content overflow report:', message.overflow,
          'scrollH:', message.scrollHeight, 'viewportH:', message.viewportHeight);
        document.dispatchEvent(new CustomEvent('ai-sdk-content-overflow', { detail: message }));
        break;

      case 'ai-sdk-request-next':
        console.log('[AIBridge] Iframe requested next sub-stage');
        document.dispatchEvent(new CustomEvent('ai-sdk-request-next'));
        break;

      case 'ai-sdk-play-sfx':
        this.aiSDK.playSfx(message.name);
        this.sendToIframe(sourceWindow, { type: 'ai-sdk-play-sfx-ack', requestId: message.requestId });
        break;

      case 'ai-sdk-start-bg-music':
        this.aiSDK.startBgMusic(message.style || 'calm');
        this.sendToIframe(sourceWindow, { type: 'ai-sdk-start-bg-music-ack', requestId: message.requestId });
        break;

      case 'ai-sdk-start-bg-music-url':
        this.aiSDK.startBgMusicFromUrl(message.url, message.loopConfig);
        this.sendToIframe(sourceWindow, { type: 'ai-sdk-start-bg-music-url-ack', requestId: message.requestId });
        break;

      case 'ai-sdk-stop-bg-music':
        this.aiSDK.stopBgMusic();
        this.sendToIframe(sourceWindow, { type: 'ai-sdk-stop-bg-music-ack', requestId: message.requestId });
        break;

      case 'ai-sdk-set-audio-volume':
        this.aiSDK.setAudioVolume(message.channel || 'sfx', message.level ?? 0.5);
        this.sendToIframe(sourceWindow, { type: 'ai-sdk-set-audio-volume-ack', requestId: message.requestId });
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

// SDK generation is now handled by interaction-sdk-builder.ts
// See INTERACTION_BUILDER_SDK.md for documentation

