import { Injectable, inject } from '@angular/core';
import { Observable, Subscription, Subscriber } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  InteractionAIContextService,
  InteractionEvent,
  LLMResponse,
  ResponseAction,
  InteractionAIResponseEvent,
} from './interaction-ai-context.service';
import { SnackMessageService } from './snack-message.service';
import { environment } from '../../../environments/environment';

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

export interface InstanceData {
  id: string;
  lessonId: string;
  stageId: string;
  substageId: string;
  interactionTypeId: string;
  processedContentId?: string;
  instanceData: Record<string, any>;
  createdAt: Date;
}

export interface UserProgress {
  id: string;
  userId: string;
  tenantId: string;
  lessonId: string;
  stageId: string;
  substageId: string;
  interactionTypeId: string;
  startTimestamp: Date;
  completeTimestamp?: Date;
  attempts: number;
  completed: boolean;
  score?: number;
  timeTakenSeconds?: number;
  interactionEvents?: Array<{ type: string; timestamp: Date; data: Record<string, any> }>;
  customData?: Record<string, any>;
}

export interface PublicProfile {
  userId: string;
  displayName?: string;
  preferences?: Record<string, any>;
  publicAvatarUrl?: string;
  shareName: boolean;
  sharePreferences: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class InteractionAISDK {
  private snackService = inject(SnackMessageService);
  private http = inject(HttpClient);
  private teacherWidgetRef: any = null; // Reference to FloatingTeacherWidgetComponent
  private mediaPlayerRef: any = null; // Reference to MediaPlayerComponent

  // Current interaction context (set by lesson-view component)
  private currentLessonId: string | null = null;
  private currentStageId: string | null = null;
  private currentSubstageId: string | null = null;
  private currentInteractionTypeId: string | null = null;
  private currentProcessedContentId: string | null = null;
  private currentUserId: string | null = null;
  private currentTenantId: string | null = null;
  private currentUserRole: string | null = null;

  constructor(private contextService: InteractionAIContextService) {}

  /**
   * Set reference to teacher widget for posting messages
   * Called by lesson-view component
   */
  setTeacherWidgetRef(widget: any): void {
    this.teacherWidgetRef = widget;
  }

  /**
   * Set reference to media player component for media control
   * Called by lesson-view component for uploaded-media interactions
   */
  setMediaPlayerRef(player: any): void {
    this.mediaPlayerRef = player;
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
    // Only minimize if widget is already visible and not hidden
    // Don't show it if it's hidden - minimize should only work on visible widgets
    if (this.teacherWidgetRef) {
      // Check if widget is hidden - if so, don't do anything
      // The widget component should expose isHidden, but for now we'll just try to minimize
      // If it's hidden, minimize() should be a no-op or the widget should handle it
      this.teacherWidgetRef.minimize();
      console.log('[InteractionAISDK] ✅ Minimized chat UI');
    } else {
      console.warn('[InteractionAISDK] ⚠️ Teacher widget reference not available');
    }
  }

  /**
   * Show/restore the chat UI (if minimized or hidden)
   */
  showChatUI(): void {
    // Dispatch event to request widget to be shown (if hidden)
    const showEvent = new CustomEvent('interaction-request-show-widget', {
      detail: { source: 'interaction-sdk', action: 'show' }
    });
    window.dispatchEvent(showEvent);
    
    // Wait a moment for widget to be shown, then call openWidget
    setTimeout(() => {
      if (this.teacherWidgetRef) {
        this.teacherWidgetRef.openWidget();
        console.log('[InteractionAISDK] ✅ Showed chat UI');
      } else {
        console.warn('[InteractionAISDK] ⚠️ Teacher widget reference not available after show request');
      }
    }, 100);
  }

  /**
   * Activate fullscreen mode
   */
  activateFullscreen(): void {
    // Access the lesson view component through a service or event
    // For now, we'll use a custom event that the lesson view can listen to
    const event = new CustomEvent('interaction-request-fullscreen', {
      detail: { source: 'interaction-sdk', action: 'activate' }
    });
    window.dispatchEvent(event);
    console.log('[InteractionAISDK] ✅ Dispatched fullscreen activation event');
  }

  /**
   * Deactivate fullscreen mode
   */
  deactivateFullscreen(): void {
    const event = new CustomEvent('interaction-request-fullscreen', {
      detail: { source: 'interaction-sdk', action: 'deactivate' }
    });
    window.dispatchEvent(event);
    console.log('[InteractionAISDK] ✅ Dispatched fullscreen deactivation event');
  }

  /**
   * Post a message to the AI Teacher chat UI
   * @param content Message text
   * @param role Message role ('user' | 'assistant' | 'error')
   * @param openChat If true, opens/restores the chat widget if minimized
   */
  postToChat(content: string, role: 'user' | 'assistant' | 'error' = 'assistant', openChat: boolean = false): void {
    // Ensure widget is visible first
    const showEvent = new CustomEvent('interaction-request-show-widget', {
      detail: { source: 'interaction-sdk' }
    });
    window.dispatchEvent(showEvent);
    
    // Wait a moment for widget to be shown, then post message
    setTimeout(() => {
      if (this.teacherWidgetRef) {
        if (openChat) {
          this.teacherWidgetRef.openWidget();
        }
        // Use addChatMessage which will update the widget's chatMessages
        this.teacherWidgetRef.addChatMessage(content, role);
        console.log('[InteractionAISDK] ✅ Posted message to chat:', content.substring(0, 50));
      } else {
        console.warn('[InteractionAISDK] ⚠️ Teacher widget reference not set, cannot post to chat');
      }
    }, 100);
  }

  /**
   * Show a script block in the teacher widget
   * @param text Script text to display
   * @param openChat If true, opens/restores the chat widget if minimized
   */
  showScript(text: string, openChat: boolean = false): void {
    // Ensure widget is visible first
    const showEvent = new CustomEvent('interaction-request-show-widget', {
      detail: { source: 'interaction-sdk' }
    });
    window.dispatchEvent(showEvent);
    
    // Wait a moment for widget to be shown, then show script
    setTimeout(() => {
      if (this.teacherWidgetRef) {
        if (openChat) {
          this.teacherWidgetRef.openWidget();
        }
        this.teacherWidgetRef.showScript(text);
        console.log('[InteractionAISDK] ✅ Showed script:', text.substring(0, 50));
      } else {
        console.warn('[InteractionAISDK] Teacher widget reference not set, cannot show script');
      }
    }, 100);
  }

  /**
   * Show a snack message (temporary notification)
   * @param content Message text
   * @param duration Duration in milliseconds (undefined = until manually closed or replaced)
   * @param hideFromChatUI If true, don't post to chat UI (default: false, posts to chat by default)
   */
  showSnack(content: string, duration?: number, hideFromChatUI: boolean = false): string {
    const snackId = this.snackService.show(content, duration);
    
    // By default, also post to chat UI unless hideFromChatUI is true
    if (!hideFromChatUI) {
      // Use postToChat which will ensure widget is visible
      this.postToChat(content, 'assistant', false);
    }
    
    return snackId;
  }

  /**
   * Hide current snack message
   */
  hideSnack(): void {
    this.snackService.hide();
  }

  /**
   * Set current interaction context (called by lesson-view component)
   */
  setContext(lessonId: string, stageId: string, substageId: string, interactionTypeId: string, processedContentId?: string, userId?: string, tenantId?: string, userRole?: string): void {
    this.currentLessonId = lessonId;
    this.currentStageId = stageId;
    this.currentSubstageId = substageId;
    this.currentInteractionTypeId = interactionTypeId;
    this.currentProcessedContentId = processedContentId || null;
    this.currentUserId = userId || null;
    this.currentTenantId = tenantId || null;
    this.currentUserRole = userRole || null;
  }

  /**
   * Get HTTP headers with user/tenant info
   */
  private getHeaders(): HttpHeaders {
    const headers: { [key: string]: string } = {};
    if (this.currentUserId) {
      headers['x-user-id'] = this.currentUserId;
    }
    if (this.currentTenantId) {
      headers['x-tenant-id'] = this.currentTenantId;
    }
    if (this.currentUserRole) {
      headers['x-user-role'] = this.currentUserRole;
    }
    return new HttpHeaders(headers);
  }

  /**
   * Save instance data (anonymous, all students)
   * This data is stored separately from user accounts and accessible to interaction builders
   */
  async saveInstanceData(data: Record<string, any>): Promise<void> {
    if (!this.currentLessonId || !this.currentStageId || !this.currentSubstageId || !this.currentInteractionTypeId) {
      throw new Error('Interaction context not set. Call setContext() first.');
    }

    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/interaction-data/instance`, {
          lessonId: this.currentLessonId,
          stageId: this.currentStageId,
          substageId: this.currentSubstageId,
          interactionTypeId: this.currentInteractionTypeId,
          processedContentId: this.currentProcessedContentId,
          instanceData: data,
        }, { headers: this.getHeaders() })
      );
      console.log('[InteractionAISDK] ✅ Instance data saved');
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Failed to save instance data:', error);
      throw error;
    }
  }

  /**
   * Get instance data history (accessible to interaction builders and super-admins only)
   */
  async getInstanceDataHistory(filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<InstanceData[]> {
    if (!this.currentLessonId || !this.currentStageId || !this.currentSubstageId || !this.currentInteractionTypeId) {
      throw new Error('Interaction context not set. Call setContext() first.');
    }

    try {
      const params: any = {
        interactionTypeId: this.currentInteractionTypeId,
        lessonId: this.currentLessonId,
        substageId: this.currentSubstageId,
      };

      if (filters?.dateFrom) {
        params.dateFrom = filters.dateFrom.toISOString();
      }
      if (filters?.dateTo) {
        params.dateTo = filters.dateTo.toISOString();
      }
      if (filters?.limit) {
        params.limit = filters.limit.toString();
      }

      const response = await firstValueFrom(
        this.http.get<{ data: InstanceData[] }>(`${environment.apiUrl}/interaction-data/instance/history`, { 
          params,
          headers: this.getHeaders()
        })
      );
      return response.data;
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Failed to get instance data history:', error);
      throw error;
    }
  }

  /**
   * Save or update user progress
   */
  async saveUserProgress(data: {
    score?: number;
    timeTakenSeconds?: number;
    interactionEvents?: Array<{ type: string; timestamp: Date; data: Record<string, any> }>;
    customData?: Record<string, any>;
    completed?: boolean;
  }): Promise<UserProgress> {
    if (!this.currentLessonId || !this.currentStageId || !this.currentSubstageId || !this.currentInteractionTypeId) {
      throw new Error('Interaction context not set. Call setContext() first.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ saved: boolean; progress: UserProgress }>(`${environment.apiUrl}/interaction-data/user-progress`, {
          lessonId: this.currentLessonId,
          stageId: this.currentStageId,
          substageId: this.currentSubstageId,
          interactionTypeId: this.currentInteractionTypeId,
          ...data,
        }, { headers: this.getHeaders() })
      );
      console.log('[InteractionAISDK] ✅ User progress saved');
      return response.progress;
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Failed to save user progress:', error);
      throw error;
    }
  }

  /**
   * Get current user's progress for this interaction
   */
  async getUserProgress(): Promise<UserProgress | null> {
    if (!this.currentLessonId || !this.currentStageId || !this.currentSubstageId || !this.currentInteractionTypeId) {
      throw new Error('Interaction context not set. Call setContext() first.');
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ progress: UserProgress | null }>(
          `${environment.apiUrl}/interaction-data/user-progress/${this.currentLessonId}/${this.currentStageId}/${this.currentSubstageId}/${this.currentInteractionTypeId}`,
          { headers: this.getHeaders() }
        )
      );
      return response.progress;
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Failed to get user progress:', error);
      throw error;
    }
  }

  /**
   * Update user progress (partial update)
   */
  async updateUserProgress(updates: Partial<UserProgress>): Promise<UserProgress> {
    return await this.saveUserProgress({
      score: updates.score,
      timeTakenSeconds: updates.timeTakenSeconds,
      interactionEvents: updates.interactionEvents,
      customData: updates.customData,
      completed: updates.completed,
    });
  }

  /**
   * Mark interaction as completed
   */
  async markCompleted(): Promise<UserProgress> {
    if (!this.currentLessonId || !this.currentStageId || !this.currentSubstageId || !this.currentInteractionTypeId) {
      throw new Error('Interaction context not set. Call setContext() first.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ completed: boolean; progress: UserProgress }>(`${environment.apiUrl}/interaction-data/user-progress/complete`, {
          lessonId: this.currentLessonId,
          stageId: this.currentStageId,
          substageId: this.currentSubstageId,
          interactionTypeId: this.currentInteractionTypeId,
        }, { headers: this.getHeaders() })
      );
      console.log('[InteractionAISDK] ✅ Interaction marked as completed');
      return response.progress;
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Failed to mark as completed:', error);
      throw error;
    }
  }

  /**
   * Increment attempts counter
   */
  async incrementAttempts(): Promise<UserProgress> {
    if (!this.currentLessonId || !this.currentStageId || !this.currentSubstageId || !this.currentInteractionTypeId) {
      throw new Error('Interaction context not set. Call setContext() first.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ incremented: boolean; progress: UserProgress }>(
          `${environment.apiUrl}/interaction-data/user-progress/increment-attempts`,
          {
            lessonId: this.currentLessonId,
            stageId: this.currentStageId,
            substageId: this.currentSubstageId,
            interactionTypeId: this.currentInteractionTypeId,
          },
          { headers: this.getHeaders() }
        )
      );
      console.log('[InteractionAISDK] ✅ Attempts incremented');
      return response.progress;
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Failed to increment attempts:', error);
      throw error;
    }
  }

  /**
   * Get user's public profile (if available and shared)
   */
  async getUserPublicProfile(userId?: string): Promise<PublicProfile | null> {
    // If no userId provided, get current user's profile
    // For now, we'll need to get userId from auth context
    // This is a placeholder - actual implementation should get userId from auth service
    if (!userId) {
      console.warn('[InteractionAISDK] ⚠️ userId not provided, cannot fetch public profile');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ profile: PublicProfile | null }>(`${environment.apiUrl}/interaction-data/user-profile/${userId}`)
      );
      return response.profile;
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Failed to get user public profile:', error);
      return null;
    }
  }

  // ========================================
  // Media Control Methods (for uploaded-media interactions)
  // ========================================

  /**
   * Play the media player
   * @returns Promise that resolves when play starts, or rejects if media player not available
   */
  playMedia(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.mediaPlayerRef) {
        console.warn('[InteractionAISDK] ⚠️ Media player reference not set, cannot play media');
        reject(new Error('Media player not available'));
        return;
      }
      
      try {
        this.mediaPlayerRef.play();
        console.log('[InteractionAISDK] ▶️ Media play requested');
        resolve();
      } catch (error: any) {
        console.error('[InteractionAISDK] ❌ Error playing media:', error);
        reject(error);
      }
    });
  }

  /**
   * Pause the media player
   */
  pauseMedia(): void {
    if (!this.mediaPlayerRef) {
      console.warn('[InteractionAISDK] ⚠️ Media player reference not set, cannot pause media');
      return;
    }
    
    try {
      this.mediaPlayerRef.pause();
      console.log('[InteractionAISDK] ⏸ Media pause requested');
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Error pausing media:', error);
    }
  }

  /**
   * Seek to a specific time in the media
   * @param time Time in seconds
   */
  seekMedia(time: number): void {
    if (!this.mediaPlayerRef) {
      console.warn('[InteractionAISDK] ⚠️ Media player reference not set, cannot seek media');
      return;
    }
    
    try {
      this.mediaPlayerRef.seekTo(time);
      console.log('[InteractionAISDK] ⏩ Media seek requested to:', time, 'seconds');
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Error seeking media:', error);
    }
  }

  /**
   * Set media volume
   * @param volume Volume level (0.0 to 1.0)
   */
  setMediaVolume(volume: number): void {
    if (!this.mediaPlayerRef) {
      console.warn('[InteractionAISDK] ⚠️ Media player reference not set, cannot set volume');
      return;
    }
    
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.mediaPlayerRef.setVolume(clampedVolume);
      console.log('[InteractionAISDK] 🔊 Media volume set to:', clampedVolume);
      
      // Emit event to update lesson view's volume slider
      const volumeEvent = new CustomEvent('interaction-media-volume-changed', {
        detail: { volume: clampedVolume }
      });
      window.dispatchEvent(volumeEvent);
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Error setting media volume:', error);
    }
  }

  /**
   * Get current playback time
   * @returns Current time in seconds, or 0 if media player not available
   */
  getMediaCurrentTime(): number {
    if (!this.mediaPlayerRef) {
      console.warn('[InteractionAISDK] ⚠️ Media player reference not set, cannot get current time');
      return 0;
    }
    
    try {
      return this.mediaPlayerRef.getCurrentTime();
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Error getting current time:', error);
      return 0;
    }
  }

  /**
   * Get media duration
   * @returns Duration in seconds, or 0 if media player not available
   */
  getMediaDuration(): number {
    if (!this.mediaPlayerRef) {
      console.warn('[InteractionAISDK] ⚠️ Media player reference not set, cannot get duration');
      return 0;
    }
    
    try {
      return this.mediaPlayerRef.getDuration();
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Error getting duration:', error);
      return 0;
    }
  }

  /**
   * Check if media is currently playing
   * @returns true if playing, false otherwise
   */
  isMediaPlaying(): boolean {
    if (!this.mediaPlayerRef) {
      return false;
    }
    
    try {
      return this.mediaPlayerRef.isPlaying();
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Error checking play state:', error);
      return false;
    }
  }

  /**
   * Show overlay HTML content (for media player interactions)
   * Makes the overlay visible if it was hidden
   */
  showOverlayHtml(): void {
    if (!this.mediaPlayerRef) {
      console.warn('[InteractionAISDK] ⚠️ Media player reference not set, cannot show overlay');
      return;
    }
    
    try {
      // Dispatch event to show overlay
      const showEvent = new CustomEvent('interaction-show-overlay-html', {
        detail: { source: 'interaction-sdk' }
      });
      window.dispatchEvent(showEvent);
      console.log('[InteractionAISDK] ✅ Show overlay HTML requested');
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Error showing overlay:', error);
    }
  }

  /**
   * Hide overlay HTML content (for media player interactions)
   * Hides text content but keeps buttons visible
   */
  hideOverlayHtml(): void {
    if (!this.mediaPlayerRef) {
      console.warn('[InteractionAISDK] ⚠️ Media player reference not set, cannot hide overlay');
      return;
    }
    
    try {
      // Dispatch event to hide overlay
      const hideEvent = new CustomEvent('interaction-hide-overlay-html', {
        detail: { source: 'interaction-sdk' }
      });
      window.dispatchEvent(hideEvent);
      console.log('[InteractionAISDK] ✅ Hide overlay HTML requested');
    } catch (error: any) {
      console.error('[InteractionAISDK] ❌ Error hiding overlay:', error);
    }
  }
}

