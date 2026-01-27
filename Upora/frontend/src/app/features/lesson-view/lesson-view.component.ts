import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
// html2canvas will be dynamically imported
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LessonService } from '../../core/services/lesson.service';
import { WebSocketService, ChatMessage } from '../../core/services/websocket.service';
import { ScreenshotStorageService } from '../../core/services/screenshot-storage.service';
import { InteractionAISDK } from '../../core/services/interaction-ai-sdk.service';
import { InteractionAIBridgeService } from '../../core/services/interaction-ai-bridge.service';
import { SnackMessageService } from '../../core/services/snack-message.service';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Lesson, Stage, SubStage } from '../../core/models/lesson.model';
import { environment } from '../../../environments/environment';
import { DEFAULT_LESSON_ID, isDefaultLessonId } from '../../core/constants/default-lesson-id';
import { FloatingTeacherWidgetComponent, ScriptBlock, ChatMessage as WidgetChatMessage } from '../../shared/components/floating-teacher/floating-teacher-widget.component';
import { SnackMessageComponent } from '../../shared/components/snack-message/snack-message.component';
import { MediaPlayerComponent } from '../../shared/components/media-player/media-player.component';
import { VideoUrlPlayerComponent } from '../../shared/components/video-url-player/video-url-player.component';

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, FloatingTeacherWidgetComponent, SnackMessageComponent, MediaPlayerComponent, VideoUrlPlayerComponent],
  template: `
    <div class="bg-brand-dark text-white overflow-hidden flex flex-col md:flex-row lesson-view-wrapper" [class.fullscreen-active]="isFullscreen">
      <!-- Mobile overlay -->
      <div *ngIf="isMobileNavOpen" 
           (click)="closeMobileNav()"
           class="fixed inset-0 bg-black/60 z-30 md:hidden"></div>

      <!-- Sidebar -->
      <aside 
        [style.width.px]="navWidth"
        [class.hidden]="navWidth === 0"
        class="sidebar bg-brand-black transition-all duration-300 ease-in-out z-40 
               md:flex md:flex-shrink-0"
        [class.-translate-x-full]="!isMobileNavOpen"
        [class.translate-x-0]="isMobileNavOpen">
        
        <!-- Sidebar Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-700">
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-bold truncate text-white">{{ lesson?.title || 'Lesson' }}</h2>
            <p class="text-xs text-gray-400">{{ lesson?.durationMinutes || 0 }} minutes</p>
          </div>
          <button (click)="closeMobileNav()" class="md:hidden text-white p-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Stages List -->
        <div class="flex-1 overflow-y-auto">
          <div *ngFor="let stage of lessonStages" class="border-b border-gray-800">
            <div class="p-4 hover:bg-gray-800 cursor-pointer"
                 (click)="toggleStage(stage.id)">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold text-white">{{ stage.title }}</h3>
                  <p class="text-sm text-gray-400">{{ stage.type || 'Stage' }}<span *ngIf="stage.subStages"> • {{ stage.subStages.length }} sub-stages</span></p>
                </div>
                <div class="flex items-center space-x-2">
                  <span *ngIf="stage.passed" class="text-green-500">✓</span>
                  <svg class="w-5 h-5 transition-transform" 
                       [class.rotate-180]="expandedStages.has(stage.id)"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Sub-stages -->
            <div *ngIf="expandedStages.has(stage.id)" class="bg-gray-900">
              <div *ngFor="let subStage of stage.subStages"
                   (click)="selectSubStage(stage.id, subStage.id)"
                   [class.bg-brand-red]="activeSubStageId === subStage.id"
                   [class.bg-gray-800]="activeSubStageId !== subStage.id"
                   class="p-3 pl-8 hover:bg-gray-700 cursor-pointer border-l-4 border-transparent hover:border-brand-red transition-all">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="text-sm font-medium">{{ subStage.title }}</h4>
                    <p class="text-xs text-gray-400">{{ subStage.type }} • {{ subStage.duration }}min</p>
                  </div>
                  <span *ngIf="subStage.completed" class="text-green-500 text-sm">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Exit Button -->
        <div class="p-4 border-t border-gray-700 space-y-2">
          <button 
            *ngIf="lesson"
            (click)="toggleMyList()"
            class="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition flex items-center justify-center">
            <svg *ngIf="!isInMyList()" class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <svg *ngIf="isInMyList()" class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            {{ isInMyList() ? 'In My List' : 'Add to List' }}
          </button>
          <button 
            (click)="exitLesson()"
            class="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition">
            Exit Lesson
          </button>
        </div>
      </aside>

      <!-- Resize Handle (Desktop) -->
      <div 
        (mousedown)="startResize($event)"
        class="w-2 h-full bg-gray-900 hover:bg-brand-red cursor-col-resize items-center justify-center relative group hidden md:flex"
        *ngIf="navWidth > 0">
        <div class="absolute z-10 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 
                    bg-gray-700 hover:bg-brand-red text-white p-1 rounded-full 
                    opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"></path>
          </svg>
        </div>
      </div>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden relative">
        <!-- Collapse button (Desktop) -->
        <button *ngIf="navWidth === 0"
                (click)="toggleNavCollapse()"
                class="absolute hidden md:block z-20 top-6 left-4 bg-gray-800 hover:bg-brand-red text-white p-2 rounded-full transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>

        <!-- Mobile Header (No burger - FAB handles stages) -->
        <header class="md:hidden flex items-center justify-center px-4 bg-brand-black border-b border-gray-700 flex-shrink-0" style="height: 48px;">
          <h1 class="font-semibold text-sm truncate">{{ lesson?.title }}</h1>
        </header>

        <!-- Content Area -->
        <div class="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto pb-32 md:pb-8 relative content-area" [class.fullscreen]="isFullscreen">
          <!-- Fullscreen Toggle -->
          <button 
            class="fullscreen-toggle"
            (click)="toggleFullscreen()"
            [title]="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'">
            <svg *ngIf="!isFullscreen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
            </svg>
            <svg *ngIf="isFullscreen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"/>
            </svg>
          </button>

          <div *ngIf="activeSubStage; else selectPrompt">
            <!-- Loading State -->
            <div *ngIf="isLoadingInteraction" class="bg-brand-black rounded-lg p-12 flex items-center justify-center">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
                <p class="text-brand-gray">Loading interaction...</p>
              </div>
            </div>

            <!-- Uploaded Media Interactions -->
            <div *ngIf="!isLoadingInteraction && interactionBuild?.interactionTypeCategory === 'uploaded-media' && mediaPlayerData && !interactionError" class="media-interaction-container">
              <app-media-player
                #mediaPlayer
                [mediaUrl]="mediaPlayerData.mediaUrl"
                [mediaType]="mediaPlayerData.mediaType"
                [config]="mediaPlayerData.config"
                [overlayHtml]="mediaPlayerData.overlayHtml"
                [overlayCss]="mediaPlayerData.overlayCss"
                [overlayJs]="mediaPlayerData.overlayJs"
                (mediaLoaded)="onMediaLoaded($event)"
                (timeUpdate)="onMediaTimeUpdate($event)"
                (playEvent)="onMediaPlay()"
                (pauseEvent)="onMediaPause()"
                (endedEvent)="onMediaEnded()"
                (errorEvent)="onMediaError($event)">
              </app-media-player>
              
              <!-- Section below media player (when displayMode is 'section') -->
              <div *ngIf="mediaPlayerData.displayMode === 'section' && (mediaPlayerData.sectionHtml || mediaPlayerData.sectionCss || mediaPlayerData.sectionJs)" 
                   class="interaction-section-below"
                   [style.height]="mediaPlayerData.sectionHeight || 'auto'"
                   [style.min-height]="mediaPlayerData.sectionMinHeight || '200px'"
                   [style.max-height]="mediaPlayerData.sectionMaxHeight || 'none'">
                <div [innerHTML]="getSanitizedSectionHtml(mediaPlayerData.sectionHtml || '', mediaPlayerData.sectionCss || '')"></div>
              </div>
            </div>

            <!-- Video URL Interactions -->
            <div *ngIf="!isLoadingInteraction && interactionBuild?.interactionTypeCategory === 'video-url' && videoUrlPlayerData && !interactionError" class="media-interaction-container">
              <app-video-url-player
                #videoUrlPlayer
                [config]="videoUrlPlayerData.config"
                [overlayHtml]="videoUrlPlayerData.overlayHtml"
                [overlayCss]="videoUrlPlayerData.overlayCss"
                [overlayJs]="videoUrlPlayerData.overlayJs"
                (videoLoaded)="onVideoUrlLoaded($event)"
                (timeUpdate)="onVideoUrlTimeUpdate($event)"
                (playEvent)="onVideoUrlPlay()"
                (pauseEvent)="onVideoUrlPause()"
                (endedEvent)="onVideoUrlEnded()"
                (errorEvent)="onVideoUrlError($event)">
              </app-video-url-player>

              <!-- Section below player (when displayMode is 'section') -->
              <div *ngIf="videoUrlPlayerData.displayMode === 'section' && (videoUrlPlayerData.sectionHtml || videoUrlPlayerData.sectionCss || videoUrlPlayerData.sectionJs)" 
                   #videoUrlSectionContainer
                   class="interaction-section-below"
                   [style.height]="videoUrlPlayerData.sectionHeight || 'auto'"
                   [style.min-height]="videoUrlPlayerData.sectionMinHeight || '200px'"
                   [style.max-height]="videoUrlPlayerData.sectionMaxHeight || 'none'">
                <div [innerHTML]="getSanitizedSectionHtml(videoUrlPlayerData.sectionHtml || '', videoUrlPlayerData.sectionCss || '')"></div>
              </div>
            </div>

            <!-- PixiJS/HTML/iframe Interactions -->
            <div *ngIf="!isLoadingInteraction && interactionBuild && interactionBuild?.interactionTypeCategory !== 'uploaded-media' && interactionBlobUrl && !interactionError" class="interaction-build-container">
              <!-- iFrame interactions -->
              <div *ngIf="interactionBuild?.interactionTypeCategory === 'iframe'" class="iframe-interaction-wrapper">
                <!-- iFrame - always visible -->
                <iframe 
                  #interactionIframe
                  [src]="interactionBlobUrl" 
                  [attr.data-key]="interactionPreviewKey"
                  class="interaction-iframe"
                  frameborder="0"
                  sandbox="allow-scripts allow-same-origin"
                  (load)="onInteractionIframeLoad()"
                  style="width: 100%; min-height: 600px; max-height: 90vh; border: none; display: block;"></iframe>
                
                <!-- Section below iFrame (when overlayMode is 'section' and HTML/CSS/JS exists) -->
                <div *ngIf="getIframeOverlayMode() === 'section' && (interactionBuild.htmlCode || interactionBuild.cssCode || interactionBuild.jsCode)" 
                     class="interaction-section-below"
                     style="width: 100%; margin-top: 20px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;"
                     [innerHTML]="getSanitizedIframeSectionHtml()"></div>
              </div>
              
              <!-- Regular iframe for non-iframe interactions (PixiJS/HTML) -->
              <iframe 
                *ngIf="interactionBuild?.interactionTypeCategory !== 'iframe'"
                #interactionIframe
                [src]="interactionBlobUrl" 
                [attr.data-key]="interactionPreviewKey"
                class="interaction-iframe"
                frameborder="0"
                sandbox="allow-scripts allow-same-origin"
                (load)="onInteractionIframeLoad()"
                style="width: 100%; min-height: 600px; max-height: 90vh; border: none; overflow: auto;"></iframe>
            </div>

            <!-- Error message for missing/invalid processed content -->
            <div *ngIf="!isLoadingInteraction && interactionError" class="bg-red-900/20 border-2 border-red-500 rounded-lg p-8 text-center">
              <div class="text-red-400 text-2xl mb-4">⚠️</div>
              <h3 class="text-red-400 text-xl font-bold mb-2">Interaction Data Error</h3>
              <p class="text-red-300">{{ interactionError }}</p>
              <p class="text-red-200 text-sm mt-4">Please contact the lesson creator or administrator to fix this issue.</p>
            </div>

            <!-- Score Display (after completion) -->
            <div *ngIf="interactionScore !== null" class="mt-6 bg-brand-black rounded-lg p-6">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-bold text-white mb-2">Sub-stage Complete!</h3>
                  <p class="text-brand-gray">You scored {{ interactionScore }}%</p>
                </div>
                <div class="text-5xl font-bold" 
                     [class.text-green-500]="interactionScore === 100"
                     [class.text-yellow-500]="interactionScore >= 70 && interactionScore < 100"
                     [class.text-brand-red]="interactionScore < 70">
                  {{ interactionScore }}%
                </div>
              </div>
            </div>

            <!-- Embedded Interaction (from JSON) - Only show for non-HTML interactions -->
            <div *ngIf="!isLoadingInteraction && !interactionData && !interactionBuild && getEmbeddedInteraction()">
              <!-- Error message if config is empty -->
              <div *ngIf="getEmbeddedInteraction()?.type === 'true-false-selection' && !hasValidInteractionConfig(getEmbeddedInteraction()?.config)" 
                   class="bg-red-900/20 border-2 border-red-500 rounded-lg p-8 text-center">
                <div class="text-red-400 text-2xl mb-4">⚠️</div>
                <h3 class="text-red-400 text-xl font-bold mb-2">Interaction Not Configured</h3>
                <p class="text-red-300">This interaction has not been configured correctly by the lesson-builder.</p>
                <p class="text-red-200 text-sm mt-2">Please contact the lesson creator to fix this issue.</p>
              </div>
              
              <!-- True/False Selection is now an HTML interaction and will be rendered via iframe -->
            </div>

            <!-- Fallback for no interaction data -->
            <div *ngIf="!isLoadingInteraction && !interactionData && !getEmbeddedInteraction() && !interactionBuild" class="bg-brand-black rounded-lg aspect-video flex items-center justify-center text-brand-gray">
              <div class="text-center">
                <p class="text-xl mb-4">Content for "{{ activeSubStage.title }}"</p>
                <p class="text-sm text-gray-500">{{ activeSubStage.title }}</p>
                <p class="text-xs text-gray-600 mt-2">No interaction in this substage</p>
              </div>
            </div>
          </div>

          <ng-template #selectPrompt>
            <!-- End of Lesson Screen -->
            <div *ngIf="!activeStageId && lesson" class="end-of-lesson">
              <div class="end-content">
                <div class="end-icon">🎓</div>
                <h1>Lesson Complete!</h1>
                <p class="lesson-title">{{ lesson.title }}</p>
                <p class="completion-message">
                  Congratulations! You've completed this lesson.
                </p>
                <div class="end-actions">
                  <button class="btn-primary" (click)="router.navigate(['/'])">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                    Back to Home
                  </button>
                  <button class="btn-secondary" (click)="restartLesson()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                    </svg>
                    Restart Lesson
                  </button>
                </div>
              </div>
            </div>

            <!-- Initial Prompt -->
            <div *ngIf="!activeStageId && !lesson" class="flex items-center justify-center h-full">
              <p class="text-brand-gray text-xl">Select a lesson stage to begin.</p>
            </div>
          </ng-template>
        </div>

        <!-- Bottom Control Bar -->
        <div class="lesson-control-bar">
          <!-- Left: Toggle Stages -->
          <button 
            class="control-bar-btn left-btn"
            (click)="toggleSidebar()"
            [class.active]="isSidebarOpen"
            title="Toggle Stages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <!-- Center: Playback Controls -->
          <div class="center-controls">
            <button 
              class="control-bar-btn playback-btn"
              (click)="toggleScriptPlay()"
              [class.active]="isScriptPlaying"
              [title]="isScriptPlaying ? 'Pause' : 'Play'">
              <svg *ngIf="!isScriptPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg *ngIf="isScriptPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </button>
            <button 
              class="control-bar-btn playback-btn"
              (click)="skipScript()"
              [disabled]="!currentTeacherScript"
              title="Skip">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4l10 8-10 8V4zm10 0v16h2V4h-2z"/>
              </svg>
            </button>
            <button 
              class="control-bar-btn timer-btn"
              (click)="toggleTimer()"
              [class.active]="showTimer"
              title="Toggle Timer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15,1H9v2h6V1z M11,14h1.5V8H11V14z M19.03,7.39l1.42-1.42c-0.43-0.51-0.9-0.99-1.41-1.41l-1.42,1.42 C16.07,4.74,14.12,4,12,4c-4.97,0-9,4.03-9,9s4.02,9,9,9s9-4.03,9-9C21,10.88,20.26,8.93,19.03,7.39z M12,20c-3.87,0-7-3.13-7-7 s3.13-7,7-7s7,3.13,7,7S15.87,20,12,20z"/>
              </svg>
            </button>
            <div class="script-progress-info">
              <!-- Show volume control when media player or video URL is present or TTS is active, but hide when timer is shown or interaction has ended -->
              <div *ngIf="(isMediaPlayerReady || isVideoUrlReady || isTTSActive) && !showTimer && !interactionEnded" class="volume-control-container">
                <label for="volume-slider" class="volume-label">🔊</label>
                <input 
                  type="range" 
                  id="volume-slider"
                  class="volume-slider"
                  min="0" 
                  max="1" 
                  step="0.01"
                  [value]="mediaVolume"
                  (input)="onVolumeChange($event)"
                  title="Volume: {{ Math.round(mediaVolume * 100) }}%"
                />
                <span class="volume-value">{{ Math.round(mediaVolume * 100) }}%</span>
              </div>
              <!-- Show Next button when interaction has ended and auto-progress is disabled -->
              <div *ngIf="interactionEnded" class="next-button-container">
                <button class="control-bar-btn next-btn" (click)="onNextButtonClick()" title="Continue to next sub-stage">
                  Next →
                </button>
              </div>
              <!-- Show script text when no media player, no video URL, and no TTS -->
              <ng-container *ngIf="!isMediaPlayerReady && !isVideoUrlReady && !isTTSActive">
                <span *ngIf="!showTimer" class="script-title">{{ currentTeacherScript?.text?.substring(0, 40) || 'Ready to teach' }}{{ (currentTeacherScript?.text?.length || 0) > 40 ? '...' : '' }}</span>
                <span *ngIf="showTimer" class="timer-display">⏱️ {{ formatTime(elapsedSeconds) }}</span>
              </ng-container>
              <!-- Show timer when timer is enabled (even if media player or video URL is present) -->
              <span *ngIf="showTimer && (isMediaPlayerReady || isVideoUrlReady || isTTSActive)" class="timer-display">⏱️ {{ formatTime(elapsedSeconds) }}</span>
            </div>
          </div>

        </div>
      </main>

      <!-- Floating Teacher FAB (Always visible when minimized) -->
      <div 
        *ngIf="teacherWidgetHidden"
        class="teacher-fab"
        [class.draggable-fab]="isFullscreen"
        [style.left.px]="isFullscreen && fabLeft > 0 ? fabLeft : null"
        [style.top.px]="isFullscreen && fabTop > 0 ? fabTop : null"
        (click)="onFabClick($event)"
        (mousedown)="startFabDrag($event)"
        (touchstart)="startFabDrag($event)"
        [title]="isFullscreen ? 'Hold to drag' : 'Open AI Teacher'">
        <span class="fab-icon">🎓</span>
        <span *ngIf="unreadMessageCount > 0" class="fab-badge">{{ unreadMessageCount }}</span>
      </div>

      <!-- Floating Teacher Widget -->
      <app-floating-teacher-widget
        #teacherWidget
        *ngIf="!teacherWidgetHidden"
        [class.fullscreen-widget]="isFullscreen"
        [currentScript]="currentTeacherScript"
        [autoPlay]="true"
        [chatMessages]="chatMessages"
        [isAITyping]="isAITyping"
        [isConnected]="isConnected"
        [isDraggable]="isFullscreen"
        (play)="onTeacherPlay()"
        (pause)="onTeacherPause()"
        (skipRequested)="onTeacherSkip()"
        (closed)="onTeacherClosed()"
        (scriptClosed)="onScriptClosed()"
        (sendChat)="sendChatMessage($event)"
        (raiseHandClicked)="raiseHand()"
        (messageAdded)="onWidgetMessageAdded($event)"
        (widgetOpened)="onWidgetOpened()">
      </app-floating-teacher-widget>

      <!-- Snack Message Component -->
      <app-snack-message></app-snack-message>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
      padding-top: 64px;
    }
    @media (min-width: 768px) {
      :host {
        padding-top: 80px;
      }
    }
    .lesson-view-wrapper {
      height: 100%;
      max-height: 100%;
    }
    
    /* Mobile FAB - hidden on desktop/tablet */
    .mobile-fab {
      position: fixed;
      bottom: 100px;
      left: 1rem;
      width: 56px;
      height: 56px;
      background: #cc0000;
      color: white;
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      cursor: pointer;
      z-index: 50;
      transition: all 0.3s;
    }
    .mobile-fab:hover {
      background: #990000;
      transform: scale(1.1);
    }
    @media (min-width: 768px) {
      .mobile-fab {
        display: none !important;
      }
    }
    
    /* Sidebar */
    .sidebar {
      position: fixed;
      top: 64px;
      left: 0;
      bottom: 0;
      width: 280px;
      display: flex;
      flex-direction: column;
    }
    .sidebar.hidden {
      display: none;
    }
    @media (min-width: 768px) {
      .sidebar {
        position: relative;
        top: 0;
        display: flex !important;
      }
      .sidebar.-translate-x-full {
        transform: none;
      }
    }

    /* Lesson Control Bar */
    .lesson-control-bar {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      background: #000000;
      border-top: 2px solid #ff3b3f;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      z-index: 100;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
    }

    .center-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      justify-content: center;
    }

    .control-bar-btn {
      min-width: 44px;
      height: 44px;
      background: #1a1a1a;
      border: 1px solid #333333;
      border-radius: 8px;
      color: #ffffff;
      font-size: 1.25rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0 0.75rem;
      flex-shrink: 0;
    }

    .control-bar-btn:hover:not(:disabled) {
      border-color: #ff3b3f;
      transform: scale(1.05);
    }

    .control-bar-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .control-bar-btn.active {
      border-color: #ff3b3f;
    }

    /* Force specific buttons to never have red background */
    .playback-btn:hover,
    .playback-btn:focus,
    .playback-btn:active,
    .playback-btn.active {
      background: #1a1a1a !important;
    }

    .playback-btn {
      color: #ffffff;
    }

    .playback-btn:not(:disabled) {
      color: #ff3b3f;
    }

    .playback-btn.active {
      color: #ffffff;
    }

    .timer-btn {
      color: rgba(255, 255, 255, 0.5);
      background: transparent !important;
    }

    .timer-btn.active {
      color: #ff3b3f;
      background: transparent !important;
    }

    .timer-btn:hover,
    .timer-btn:focus,
    .timer-btn:active,
    .timer-btn.active:hover,
    .timer-btn.active:focus,
    .timer-btn.active:active {
      background: transparent !important;
    }

    .timer-display {
      font-size: 1rem;
      font-weight: 600;
      color: #ff3b3f;
      font-variant-numeric: tabular-nums;
    }

    .left-btn, .right-btn {
      min-width: auto;
    }

    .teacher-toggle {
      position: relative;
    }

    .teacher-toggle .icon {
      font-size: 1.5rem;
    }

    .teacher-toggle .label {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .teacher-toggle .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff3b3f;
      color: #ffffff;
      font-size: 0.625rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }

    .script-progress-info {
      flex: 1;
      overflow: hidden;
      max-width: 400px;
    }

    .script-title {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.7);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      text-align: center;
    }

    .volume-control-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
      min-width: 150px;
    }

    .next-button-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 150px;
    }

    .next-btn {
      padding: 0.5rem 1.5rem;
      background: var(--brand-primary, #3b82f6);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .next-btn:hover {
      background: var(--brand-primary-dark, #2563eb);
    }

    .volume-label {
      font-size: 1.25rem;
      cursor: pointer;
      user-select: none;
    }

    .volume-slider {
      flex: 1;
      min-width: 80px;
      height: 4px;
      background: #333333;
      border-radius: 2px;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    }

    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      background: #ff3b3f;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
    }

    .volume-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      background: #ff6b6f;
    }

    .volume-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      background: #ff3b3f;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .volume-slider::-moz-range-thumb:hover {
      transform: scale(1.2);
      background: #ff6b6f;
    }

    .volume-value {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.7);
      min-width: 35px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* Fullscreen Mode */
    .fullscreen-active .sidebar,
    .fullscreen-active .mobile-header {
      display: none !important;
    }

    .content-area.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      background: #0a0a0a;
      padding: 2rem !important;
    }

    /* Hide global header when fullscreen active */
    :host-context(.fullscreen-active) app-header,
    body.fullscreen-active app-header {
      display: none !important;
    }

    .fullscreen-toggle {
      position: fixed; /* Fixed so it doesn't scroll */
      bottom: calc(60px + 1.5rem); /* Same as before - above control bar */
      left: 1.5rem; /* Default left */
      width: 44px;
      height: 44px;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid #333333;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      transition: left 0.3s ease; /* Transition left only */
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100; /* Below sidebar */
    }
    
    /* Desktop: when sidebar is visible (not width 0) AND not fullscreen, move toggle right */
    @media (min-width: 768px) {
      .lesson-view-wrapper:not(.fullscreen-active):has(.sidebar:not([style*="width: 0px"])) .fullscreen-toggle {
        left: calc(280px + 1.5rem) !important; /* Move right when sidebar open */
      }
    }
    
    /* Mobile: hide when nav is open */
    @media (max-width: 767px) {
      .lesson-view-wrapper:has(.sidebar.translate-x-0) .fullscreen-toggle {
        display: none;
      }
    }
    
    /* When fullscreen - ALL screens - move to very bottom and left edge */
    body.fullscreen-active .fullscreen-toggle,
    .content-area.fullscreen .fullscreen-toggle,
    .fullscreen-active .content-area .fullscreen-toggle {
      bottom: 1rem !important; /* Very close to bottom */
      left: 1.5rem !important; /* FORCE to left edge */
      z-index: 9998 !important; /* Above everything in fullscreen */
    }

    .fullscreen-toggle:hover {
      background: #ff3b3f;
      border-color: #ff3b3f;
      transform: scale(1.1);
    }

    /* End of Lesson Screen */
    .end-of-lesson {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: 2rem;
      user-select: none;
      -webkit-user-select: none;
    }
    
    .end-of-lesson * {
      user-select: none;
      -webkit-user-select: none;
    }
    
    .end-of-lesson button {
      cursor: pointer !important;
    }

    .end-content {
      text-align: center;
      max-width: 600px;
    }

    .end-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
      animation: bounce 2s ease infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }

    .end-content h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #00d4ff;
      margin-bottom: 1rem;
    }

    .lesson-title {
      font-size: 1.5rem;
      color: #ffffff;
      margin-bottom: 0.5rem;
    }

    .completion-message {
      font-size: 1.125rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 2rem;
    }

    .end-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .end-actions .btn-primary,
    .end-actions .btn-secondary {
      padding: 0.875rem 2rem;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .end-actions .btn-primary {
      background: #00d4ff;
      color: #0f0f23;
    }

    .end-actions .btn-primary:hover {
      background: #00bce6;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
    }

    .end-actions .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .end-actions .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.4);
    }

    /* Teacher FAB */
    .teacher-fab {
      position: fixed;
      bottom: calc(60px + 1rem); /* Sits on top of control bar */
      right: 2rem;
      width: 70px;
      height: 70px;
      background: #000000;
      border: 2px solid #ff3b3f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(255, 59, 63, 0.4);
      transition: all 0.3s ease;
      z-index: 10001; /* Always above fullscreen */
      transform: translateY(50%); /* Half overlaps the red line */
    }

    .teacher-fab.draggable-fab {
      cursor: grab;
      bottom: auto !important;
      right: auto !important;
      transform: none;
      transition: none;
    }

    .teacher-fab.draggable-fab:active {
      cursor: grabbing;
    }

    /* Teacher Widget in Fullscreen */
    app-floating-teacher-widget.fullscreen-widget {
      z-index: 10000 !important;
    }

    app-floating-teacher-widget.fullscreen-widget ::ng-deep .teacher-widget {
      z-index: 10000 !important;
    }

    /* Hide Sidebar When Collapsed */
    .sidebar[style*="width: 0px"],
    .sidebar[style*="width:0px"] {
      display: none !important;
      overflow: hidden;
    }

    .teacher-fab:hover:not(.draggable-fab) {
      transform: translateY(50%) scale(1.1);
      box-shadow: 0 6px 20px rgba(255, 59, 63, 0.6);
      background: #1a1a1a;
    }

    .teacher-fab.draggable-fab:hover {
      box-shadow: 0 6px 20px rgba(255, 59, 63, 0.6);
      background: #1a1a1a;
    }

    .fab-icon {
      font-size: 2.25rem;
      line-height: 1;
    }

    .fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ff3b3f;
      color: #ffffff;
      font-size: 0.625rem;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 12px;
      min-width: 22px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    @media (max-width: 768px) {
      .lesson-control-bar {
        padding: 0.5rem 0.75rem;
      }

      .control-bar-btn {
        min-width: 40px;
        height: 40px;
        font-size: 1rem;
        padding: 0 0.5rem;
      }

      .script-title {
        font-size: 0.75rem;
      }

      .script-progress-info {
        max-width: 150px;
      }

      .teacher-fab {
        bottom: calc(56px + 0.75rem);
        right: 1.5rem;
        width: 60px;
        height: 60px;
      }

      .fab-icon {
        font-size: 2rem;
      }
    }
  `]
})
export class LessonViewComponent implements OnInit, OnDestroy {
  lesson: Lesson | null = null;
  lessonStages: Stage[] = [];
  activeStageId: string | number | null = null;
  activeSubStageId: string | number | null = null;
  currentStage: Stage | null = null;
  activeSubStage: SubStage | null = null;
  expandedStages = new Set<number>();
  
  // Sidebar state
  isMobileNavOpen = false;
  isSidebarOpen = true; // Desktop sidebar state
  navWidth = 280;
  private navWidthBeforeCollapse = 280;
  private isResizing = false;
  private minNavWidth = 280;
  private maxNavWidth = 600;
  
  // Chat
  chatMessage = '';
  chatMessages: ChatMessage[] = [];
  isAITyping = false;
  isConnected = false;
  isChatExpanded = false;
  screenshotRequested = false;
  pendingScreenshotMessage = '';
  screenshotTimeout: any = null; // Timeout for screenshot fallback
  lastUserMessageBeforeScreenshot = ''; // Store the original user message
  screenshotFallbackTriggered = false; // Prevent duplicate fallback sends
  isTimeoutFallback = false; // Track if current message is a timeout fallback
  generalResponseTimeout: any = null; // Timeout for general "no reply" fallback (20 seconds)
  isSendingMessage = false; // Prevent duplicate message sends
  unreadMessageCount = 0; // Track unread messages (messages received while widget is minimized/closed)
  private lastReadMessageCount = 0; // Track last read message count when widget was open
  
  // Teacher Script
  currentTeacherScript: ScriptBlock | null = null;
  private teacherScriptTimeout: any = null;
  isScriptPlaying = false;
  teacherWidgetHidden = true; // Start hidden, show on first script or manual open
  private autoAdvanceTimeout: any = null;
  interactionEnded = false; // Track if current interaction has ended (for showing Next button)
  
  // Fullscreen
  isFullscreen = false;
  
  // Lesson Timer
  showTimer = false;
  elapsedSeconds = 0;
  private timerInterval: any = null;
  
  // FAB Dragging (in fullscreen)
  fabLeft = 0;
  fabTop = 0;
  private fabDragging = false;
  private fabDidMove = false; // Track if FAB actually moved during drag
  private fabDragStartX = 0;
  private fabDragStartY = 0;
  
  // Interaction data
  interactionData: any = null;
  interactionScore: number | null = null;
  normalizedInteractionData: any = null;
  normalizedEmbeddedInteractionData: any = null;
  isLoadingInteraction = false;
  
  // Interaction build (for PixiJS/HTML/iframe interactions)
  interactionBuild: any = null;
  interactionBlobUrl: SafeResourceUrl | null = null;
  interactionPreviewKey = 0;
  interactionError: string | null = null;
  
  // Media player properties (for uploaded-media interactions)
  mediaPlayerData: {
    mediaUrl: string;
    mediaType: 'video' | 'audio';
    config: any;
    overlayHtml: string;
    overlayCss: string;
    overlayJs: string;
    sectionHtml?: string;
    sectionCss?: string;
    sectionJs?: string;
    displayMode?: 'overlay' | 'section';
    sectionHeight?: string;
    sectionMinHeight?: string;
    sectionMaxHeight?: string;
  } | null = null;
  @ViewChild('mediaPlayer') mediaPlayerRef?: MediaPlayerComponent;

  // Video URL player properties (for video-url interactions)
  videoUrlPlayerData: {
    config: any; // Passed directly to VideoUrlPlayerComponent
    overlayHtml: string;
    overlayCss: string;
    overlayJs: string;
    sectionHtml?: string;
    sectionCss?: string;
    sectionJs?: string;
    displayMode?: 'overlay' | 'section';
    sectionHeight?: string;
    sectionMinHeight?: string;
    sectionMaxHeight?: string;
    processedContentData?: any; // Processed output data (metadata, etc.) for AI context
  } | null = null;
  @ViewChild('videoUrlPlayer') videoUrlPlayerRef?: VideoUrlPlayerComponent;
  @ViewChild('videoUrlSectionContainer') videoUrlSectionContainerRef?: any;
  
  mediaVolume = 1.0; // Default volume (0.0 to 1.0)
  isTTSActive = false; // Will be true when TTS is integrated
  isMediaPlayerReady = false; // Media player (uploaded-media) is ready
  isVideoUrlReady = false; // Video URL player is ready
  Math = Math; // Expose Math to template
  
  private destroy$ = new Subject<void>();
  private processedOutputsCache = new Map<string, any[]>();
  
  @ViewChild('teacherWidget') teacherWidget?: FloatingTeacherWidgetComponent;
  @ViewChild('interactionIframe', { static: false }) interactionIframe?: any;

  constructor(
    private lessonService: LessonService,
    public router: Router,
    private route: ActivatedRoute,
    private wsService: WebSocketService,
    private http: HttpClient,
    private screenshotStorage: ScreenshotStorageService,
    private interactionAISDK: InteractionAISDK,
    private bridgeService: InteractionAIBridgeService,
    private snackService: SnackMessageService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    console.log('[LessonView] ngOnInit called');
    console.log('[LessonView] enableWebSockets:', environment.enableWebSockets);
    
    // Listen for volume changes from SDK
    window.addEventListener('interaction-media-volume-changed', ((e: CustomEvent) => {
      if (e.detail?.volume !== undefined) {
        this.mediaVolume = e.detail.volume;
        console.log('[LessonView] 🔊 Volume updated from SDK:', this.mediaVolume);
      }
    }) as EventListener);
    
    // Listen for show/hide overlay HTML events
    window.addEventListener('interaction-show-overlay-html', (() => {
      // Show overlay by removing media-playing class
      const overlayContainer = document.querySelector('.overlay-container');
      if (overlayContainer) {
        overlayContainer.classList.remove('media-playing');
        console.log('[LessonView] ✅ Overlay HTML shown');
      }
    }) as EventListener);
    
    window.addEventListener('interaction-hide-overlay-html', (() => {
      // Hide overlay by adding media-playing class
      const overlayContainer = document.querySelector('.overlay-container');
      if (overlayContainer) {
        overlayContainer.classList.add('media-playing');
        console.log('[LessonView] ✅ Overlay HTML hidden');
      }
    }) as EventListener);
    
    // Listen for interaction completion requests (from iframe interactions)
    window.addEventListener('interaction-request-progress', (() => {
      console.log('[LessonView] 📨 Received interaction-request-progress event, calling onNextButtonClick');
      this.onNextButtonClick();
    }) as EventListener);
    
    // Listen for ai-sdk-message custom events from video-url section SDK
    // These are sent via CustomEvent (same-document communication) instead of postMessage
    document.addEventListener('ai-sdk-message', ((e: CustomEvent) => {
      const message = e.detail;
      if (!message || !message.type) {
        return;
      }
      
      console.log('[LessonView] 📨 Received ai-sdk-message custom event:', message.type);
      
      // Route message to bridge service (which handles it via handleIframeMessage)
      // Create a mock MessageEvent-like object for compatibility
      const mockEvent = {
        data: message,
        source: window,
        origin: window.location.origin
      } as any;
      
      // Call bridge service's private method via a workaround
      // Since handleIframeMessage is private, we'll handle common messages directly
      switch (message.type) {
        case 'ai-sdk-minimize-chat-ui':
          this.interactionAISDK.minimizeChatUI();
          console.log('[LessonView] ✅ Minimized chat UI from SDK message');
          break;
        case 'ai-sdk-show-chat-ui':
          this.interactionAISDK.showChatUI();
          console.log('[LessonView] ✅ Showed chat UI from SDK message');
          break;
        case 'ai-sdk-activate-fullscreen':
          this.interactionAISDK.activateFullscreen();
          console.log('[LessonView] ✅ Activated fullscreen from SDK message');
          break;
        case 'ai-sdk-deactivate-fullscreen':
          this.interactionAISDK.deactivateFullscreen();
          console.log('[LessonView] ✅ Deactivated fullscreen from SDK message');
          break;
        case 'ai-sdk-post-to-chat':
          this.interactionAISDK.postToChat(message.content, message.role || 'assistant', message.openChat || false);
          console.log('[LessonView] ✅ Posted to chat from SDK message');
          break;
        case 'ai-sdk-show-script':
          this.interactionAISDK.showScript(message.text || message.script, message.openChat || false);
          console.log('[LessonView] ✅ Showed script from SDK message');
          break;
        case 'ai-sdk-show-snack':
          this.interactionAISDK.showSnack(message.content, message.duration, message.hideFromChatUI || false);
          console.log('[LessonView] ✅ Showed snack from SDK message');
          break;
        case 'ai-sdk-hide-snack':
          this.interactionAISDK.hideSnack();
          console.log('[LessonView] ✅ Hid snack from SDK message');
          break;
        case 'ai-sdk-emit-event':
          this.interactionAISDK.emitEvent(message.event, message.processedContentId);
          console.log('[LessonView] ✅ Emitted event from SDK message');
          break;
        case 'ai-sdk-update-state':
          this.interactionAISDK.updateState(message.key, message.value);
          console.log('[LessonView] ✅ Updated state from SDK message');
          break;
        case 'ai-sdk-get-state':
          // This one needs a callback, but SDK test doesn't use it with callback
          console.log('[LessonView] 📊 Get state requested from SDK message');
          break;
        default:
          console.log('[LessonView] 📨 Unhandled SDK message type:', message.type);
      }
    }) as EventListener);
    
    // Start timer immediately when lesson loads (always running in background)
    console.log('[LessonView] 🚀 Starting timer on lesson load');
    this.startTimer();
    
    // Auto-play lesson - defer to avoid change detection error
    setTimeout(() => {
      this.isScriptPlaying = true;
      console.log('[LessonView] 🎬 Auto-playing lesson');
      this.cdr.detectChanges();
    }, 0);
    
    // Track if we have a route parameter to prevent activeLesson$ from overriding
    let hasRouteParameter = false;
    
    // Get lesson ID from route params - this takes priority
    this.route.params.subscribe(params => {
      const lessonId = params['id'];
      console.log('[LessonView] Route lesson ID:', lessonId);
      
      hasRouteParameter = !!lessonId;
      
      if (lessonId) {
        // Always load from route parameter (takes priority over activeLesson$)
        this.loadLessonData(lessonId);
      }
    });
    
    // Only use activeLesson$ if there's no route parameter (for programmatic navigation)
    // This prevents mock lessons from overriding route-based loading
    this.lessonService.activeLesson$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lesson => {
        console.log('[LessonView] activeLesson$ emitted:', lesson?.title || 'null');
        
        // Only set lesson from activeLesson$ if we don't have a route parameter
        if (!hasRouteParameter && lesson) {
          console.log('[LessonView] No route parameter, using activeLesson$');
          this.setLessonData(lesson);
        } else if (hasRouteParameter) {
          console.log('[LessonView] Route parameter present, ignoring activeLesson$ to prevent mock lesson override');
        }
      });

    // Subscribe to WebSocket events
    this.wsService.connected$.pipe(takeUntil(this.destroy$)).subscribe(connected => {
      this.isConnected = connected;
      console.log('[LessonView] WebSocket connected:', connected);
    });

    this.wsService.messages$.pipe(takeUntil(this.destroy$)).subscribe(messages => {
      const previousMessageCount = this.chatMessages.length;
      this.chatMessages = messages;
      console.log('[LessonView] Chat messages updated:', messages.length);
      
      // Track unread messages (messages received while widget is minimized/closed)
      if (messages.length > previousMessageCount) {
        const newMessageCount = messages.length - previousMessageCount;
        // If widget is hidden or minimized, increment unread count
        if (this.teacherWidgetHidden || (this.teacherWidget && this.teacherWidget.isMinimized)) {
          this.unreadMessageCount += newMessageCount;
          console.log('[LessonView] 📬 Unread messages:', this.unreadMessageCount);
        } else {
          // Widget is open, update last read count
          this.lastReadMessageCount = messages.length;
        }
      }
      
      // Clear screenshot timeout if we received an assistant response
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        if (this.screenshotTimeout) {
          console.log('[LessonView] Received assistant response - clearing screenshot timeout');
          clearTimeout(this.screenshotTimeout);
          this.screenshotTimeout = null;
        }
        // Clear general response timeout
        if (this.generalResponseTimeout) {
          clearTimeout(this.generalResponseTimeout);
          this.generalResponseTimeout = null;
        }
        this.lastUserMessageBeforeScreenshot = ''; // Clear stored message
        this.screenshotFallbackTriggered = false; // Reset fallback flag
        
        // Clock emoji is already added by backend for timeout fallback responses
        // Just reset the flag
        this.isTimeoutFallback = false;
        // Reset sending flag
        this.isSendingMessage = false;
      }
    });

    this.wsService.typing$.pipe(takeUntil(this.destroy$)).subscribe(typing => {
      this.isAITyping = typing;
    });

    // Subscribe to screenshot requests
    this.wsService.screenshotRequest$.pipe(takeUntil(this.destroy$)).subscribe(request => {
      if (request && !this.screenshotRequested && !this.screenshotFallbackTriggered) {
        console.log('[LessonView] Screenshot requested by AI (silently)');
        // Store the last user message for timeout fallback
        const lastUserMsg = this.chatMessages.filter(m => m.role === 'user').pop();
        this.lastUserMessageBeforeScreenshot = lastUserMsg?.content || '';
        this.screenshotFallbackTriggered = false; // Reset fallback flag
        
        // Set timeout fallback: if no response in 10 seconds, resend without screenshot
        // Clear any existing timeout first to prevent duplicates
        if (this.screenshotTimeout) {
          clearTimeout(this.screenshotTimeout);
        }
        
        this.screenshotTimeout = setTimeout(() => {
          // Only trigger if we haven't already triggered fallback and still have the message
          if (!this.screenshotFallbackTriggered && this.lastUserMessageBeforeScreenshot) {
            // Check if this message was already sent recently (prevent duplicates)
            const recentMessages = this.chatMessages
              .filter(m => m.role === 'user')
              .slice(-3); // Check last 3 user messages
            const alreadySent = recentMessages.some(m => 
              m.content === this.lastUserMessageBeforeScreenshot
            );
            
            if (!alreadySent) {
              console.warn('[LessonView] Screenshot timeout - resending message without screenshot');
              this.screenshotFallbackTriggered = true; // Mark as triggered to prevent duplicates
              this.isTimeoutFallback = true; // Mark as timeout fallback
              // Clear screenshot state
              this.screenshotRequested = false;
              this.isAITyping = false;
              // Resend the original message without screenshot
              this.sendChatMessage(this.lastUserMessageBeforeScreenshot);
              this.lastUserMessageBeforeScreenshot = '';
            } else {
              console.warn('[LessonView] Screenshot timeout - message already sent, skipping');
            }
            this.screenshotTimeout = null;
          }
        }, 10000); // 10 seconds
        
        // Automatically handle the screenshot request
        this.handleScreenshotRequest();
      }
    });

    // Setup mouse listeners for resize
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Listen for fullscreen requests from interactions
    window.addEventListener('interaction-request-fullscreen', this.handleInteractionFullscreenRequest.bind(this) as EventListener);
    // Listen for widget show requests from interactions
    window.addEventListener('interaction-request-show-widget', this.handleInteractionShowWidgetRequest.bind(this) as EventListener);
  }
  
  /**
   * Handle widget show request from interaction SDK
   */
  private handleInteractionShowWidgetRequest(event: CustomEvent) {
    // Show the widget if it's hidden
    if (this.teacherWidgetHidden) {
      this.teacherWidgetHidden = false;
      console.log('[LessonView] ✅ Widget shown via SDK request');
      
      // Ensure widget reference is set after showing
      setTimeout(() => {
        if (this.teacherWidget) {
          this.interactionAISDK.setTeacherWidgetRef(this.teacherWidget);
          console.log('[LessonView] ✅ Teacher widget reference set after show request');
        }
      }, 100);
    }
  }

  /**
   * Handle fullscreen request from interaction SDK
   */
  private handleInteractionFullscreenRequest(event: Event) {
    const customEvent = event as CustomEvent;
    const action = customEvent.detail?.action || 'activate';
    console.log('[LessonView] Fullscreen requested by interaction SDK, action:', action);
    
    if (action === 'deactivate') {
      if (this.isFullscreen) {
        this.toggleFullscreen();
      }
    } else {
      // activate (default)
      if (!this.isFullscreen) {
        this.toggleFullscreen();
      }
    }
  }
  
  /**
   * Handle iframe load event
   */
  onInteractionIframeLoad() {
    console.log('[LessonView] Interaction iframe loaded');
    
    // Ensure teacher widget reference is set before sending SDK ready
    if (this.teacherWidget) {
      this.interactionAISDK.setTeacherWidgetRef(this.teacherWidget);
      console.log('[LessonView] ✅ Teacher widget reference set on iframe load');
    } else {
      // Retry if widget not ready yet
      setTimeout(() => {
        if (this.teacherWidget) {
          this.interactionAISDK.setTeacherWidgetRef(this.teacherWidget);
          console.log('[LessonView] ✅ Teacher widget reference set on iframe load (retry)');
        }
      }, 500);
    }
    
    // Check if config has "goFullscreenOnLoad" option
    const config = (this.activeSubStage as any)?.interaction?.config || {};
    if (config.goFullscreenOnLoad === true && !this.isFullscreen) {
      console.log('[LessonView] Config requests fullscreen on load');
      setTimeout(() => {
        this.toggleFullscreen();
      }, 300); // Small delay to ensure iframe is fully rendered
    }
    
    // Check if config has "playVideoOnLoad" option for video-url interactions
    if (this.interactionBuild?.interactionTypeCategory === 'video-url' && this.videoUrlPlayerData) {
      // Only use playVideoOnLoad if explicitly set, default to false
      const videoConfig = config.playVideoOnLoad === true;
      if (videoConfig && this.videoUrlPlayerRef && this.isVideoUrlReady) {
        console.log('[LessonView] Config requests video autoplay on load');
        setTimeout(() => {
          this.videoUrlPlayerRef?.playVideoUrl();
        }, 500); // Delay to ensure player is ready
      }
    }
    
    // Send SDK ready message after iframe is loaded
    setTimeout(() => {
      this.sendSDKReadyToIframe();
    }, 100);
  }
  
  /**
   * Send SDK ready message to iframe after it's loaded
   */
  private sendSDKReadyToIframe() {
    const iframes = document.querySelectorAll('iframe.interaction-iframe');
    iframes.forEach((iframe) => {
      const htmlIframe = iframe as HTMLIFrameElement;
      if (htmlIframe.contentWindow) {
        const interaction = this.activeSubStage?.interaction || (this.activeSubStage as any)?.interactionType;
        const interactionId = interaction?.type || interaction?.id || interaction;
        htmlIframe.contentWindow.postMessage({
          type: 'ai-sdk-ready',
          lessonId: this.lesson?.id,
          substageId: String(this.activeSubStageId),
          interactionId: interactionId,
          accountId: this.interactionAISDK.getCurrentUserId(),
        }, '*');
        console.log('[LessonView] ✅ Sent SDK ready message to iframe');
      }
    });
  }

  /**
   * Attempt to resolve a processed content output for the currently active sub-stage
   */
  private async ensureContentOutputForActiveSubstage(): Promise<string | null> {
    if (!this.lesson?.id || !this.activeSubStage) {
      return null;
    }

    const subStage = this.activeSubStage;
    
    // Check if there's a contentOutputId set, but validate it first
    if (subStage.contentOutputId !== undefined && subStage.contentOutputId !== null) {
      const normalizedId = this.normalizeContentOutputId(subStage.contentOutputId);
      // If normalization returns null, it means it's a placeholder/invalid ID
      // In that case, continue to matching logic below
      if (normalizedId) {
        return normalizedId;
      }
      // If it's invalid, clear it and continue to matching
      console.log('[LessonView] Invalid contentOutputId in sub-stage, attempting to find match...');
    }

    const outputs = await this.fetchProcessedOutputsForLesson(this.lesson.id);
    if (!outputs.length) {
      console.warn('[LessonView] No processed outputs found for lesson:', this.lesson.id);
      return null;
    }

    const interactionType = subStage.interaction?.type || subStage.interactionType;
    const subStageTitle = (subStage.title || '').toLowerCase();
    const stageTitle = (this.currentStage?.title || '').toLowerCase();

    console.log('[LessonView] Attempting to match processed output:', {
      interactionType,
      subStageTitle,
      stageTitle,
      availableOutputs: outputs.map(o => ({ id: o.id, type: o.outputType, name: o.outputName || o.title }))
    });

    let match = outputs.find(output =>
      output.outputType === interactionType &&
      (output.outputName?.toLowerCase().includes(subStageTitle) ||
       output.title?.toLowerCase().includes(subStageTitle))
    );

    if (!match && stageTitle) {
      match = outputs.find(output =>
        output.outputType === interactionType &&
        (output.outputName?.toLowerCase().includes(stageTitle) ||
         output.title?.toLowerCase().includes(stageTitle))
      );
    }

    // If still no match but there's only one output of the right type, use it
    if (!match) {
      const matchingTypeOutputs = outputs.filter(o => o.outputType === interactionType);
      if (matchingTypeOutputs.length === 1) {
        match = matchingTypeOutputs[0];
        console.log('[LessonView] Using single matching output type:', match.id);
      }
    }

    if (match) {
      console.log('[LessonView] ✅ Matched processed output:', match.id, match.outputName || match.title);
      subStage.contentOutputId = match.id;
      if (subStage.interaction) {
        subStage.interaction.contentOutputId = match.id;
      }
      return match.id;
    }

    console.warn('[LessonView] ❌ No processed output match found for sub-stage:', {
      subStageTitle,
      interactionType,
      availableTypes: [...new Set(outputs.map(o => o.outputType))]
    });
    return null;
  }

  private async fetchProcessedOutputsForLesson(lessonId: string): Promise<any[]> {
    if (this.processedOutputsCache.has(lessonId)) {
      return this.processedOutputsCache.get(lessonId)!;
    }

    try {
      const outputs = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/lesson-editor/lessons/${lessonId}/processed-outputs`)
      );
      this.processedOutputsCache.set(lessonId, outputs || []);
      return outputs || [];
    } catch (error) {
      console.error('[LessonView] Failed to fetch processed outputs for lesson:', error);
      this.processedOutputsCache.set(lessonId, []);
      return [];
    }
  }

  getProcessedContentIdForInteraction(): string | null {
    return this.normalizeContentOutputId(
      this.activeSubStage?.interaction?.contentOutputId || this.activeSubStage?.contentOutputId
    );
  }

  private normalizeContentOutputId(value?: string | number | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const id = typeof value === 'string' ? value : String(value);
    
    // Filter out placeholder/invalid IDs (e.g., 40000000-0000-0000-0000-000000000099)
    // These are placeholder UUIDs that don't represent real processed outputs
    if (id.startsWith('40000000-0000-0000-0000-') || 
        isDefaultLessonId(id) ||
        id.length < 36) {
      console.warn('[LessonView] Invalid/placeholder contentOutputId detected:', id);
      return null;
    }
    
    return id;
  }

  /**
   * Load lesson data from API
   */
  private loadLessonData(lessonId: string) {
    console.log('[LessonView] Loading lesson data for ID:', lessonId);
    
    // Check if this is a default/mock lesson ID
    if (isDefaultLessonId(lessonId)) {
      console.warn('[LessonView] ⚠️ Default/mock lesson ID detected, skipping API call');
      return;
    }
    
    // Fetch lesson from API using environment.apiUrl
    this.http.get<Lesson>(`${environment.apiUrl}/lessons/${lessonId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lesson) => {
          console.log('[LessonView] ✅ Loaded lesson from API:', lesson.title);
          this.setLessonData(lesson);
        },
        error: (error) => {
          console.error('[LessonView] ❌ Error loading lesson from API:', error);
          // Don't fall back to mock data - show error instead
          this.interactionError = `Failed to load lesson: ${error.message || 'Unknown error'}. Please ensure the lesson exists in the database.`;
        }
      });
  }

  /**
   * Set lesson data and initialize
   */
  private setLessonData(lesson: Lesson) {
    this.lesson = lesson;
    // Try data.stages first (from API), fallback to stages (for compatibility)
    const rawStages = (lesson.data as any)?.structure?.stages || lesson.data?.stages || lesson.stages || [];
    
    // Normalize stage data: convert 'substages' to 'subStages' if needed
    this.lessonStages = rawStages.map((stage: any) => ({
      ...stage,
      subStages: stage.subStages || stage.substages || []
    }));
    
    console.log('[LessonView] Lesson set - ID:', lesson.id, 'Stages:', this.lessonStages.length);
    console.log('[LessonView] First stage:', JSON.stringify(this.lessonStages[0], null, 2).substring(0, 800));
    console.log('[LessonView] First substage full:', JSON.stringify(this.lessonStages[0]?.subStages?.[0], null, 2));
    
    // Try to restore saved state from localStorage
    const savedState = this.getSavedLessonState(lesson.id.toString());
    let restored = false;
    
    if (savedState && savedState.stageId && savedState.subStageId) {
      // Find the saved stage and substage
      const savedStage = this.lessonStages.find(s => String(s.id) === String(savedState.stageId));
      if (savedStage) {
        const savedSubStage = savedStage.subStages?.find(ss => String(ss.id) === String(savedState.subStageId));
        if (savedSubStage) {
          this.activeStageId = savedStage.id;
          this.activeSubStageId = savedSubStage.id;
          this.expandedStages.add(savedStage.id);
          this.updateActiveSubStage();
          this.loadInteractionData();
          restored = true;
          console.log('[LessonView] ✅ Restored saved state:', savedState);
        }
      }
    }
    
    // If no saved state or restore failed, auto-select first stage and substage
    if (!restored && this.lessonStages.length > 0) {
      const firstStage = this.lessonStages[0];
      this.activeStageId = firstStage.id;
      this.expandedStages.add(firstStage.id);
      
      console.log('[LessonView] 📂 Auto-opened first stage:', firstStage.id);
      
      if (firstStage.subStages && firstStage.subStages.length > 0) {
        const firstSubStage = firstStage.subStages[0];
        this.activeSubStageId = firstSubStage.id;
        this.updateActiveSubStage();
        this.loadInteractionData();
        
        // Auto-play first script if it exists
        console.log('[LessonView] First substage data:', JSON.stringify(firstSubStage, null, 2).substring(0, 500));
        const scriptBlocks = (firstSubStage as any).scriptBlocks || (firstSubStage as any).script || [];
        console.log('[LessonView] Script blocks found:', scriptBlocks.length);
        if (scriptBlocks.length > 0) {
          console.log('[LessonView] 🎬 Auto-playing first script:', scriptBlocks[0]);
          this.playTeacherScript(scriptBlocks[0], scriptBlocks[0]);
        } else {
          console.log('[LessonView] ⚠️ No teacher script in first substage');
        }
      }
    }
    
    // Connect to WebSocket for AI chat if enabled
    console.log('[LessonView] Checking WebSocket connection - enabled:', environment.enableWebSockets, 'lesson.id:', lesson.id);
    
    if (environment.enableWebSockets && lesson.id) {
      console.log('[LessonView] ✅ Conditions met - calling connectToChat()');
      this.connectToChat();
    } else {
      console.warn('[LessonView] ❌ WebSocket not enabled or no lesson ID');
    }
  }

  /**
   * Connect to WebSocket chat for this lesson
   */
  connectToChat() {
    if (!this.lesson?.id) {
      console.warn('[LessonView] Cannot connect to chat - no lesson ID');
      return;
    }

    const lessonId = this.lesson.id.toString();
    const userId = environment.defaultUserId;
    const tenantId = environment.tenantId;

    console.log('[LessonView] 🔌 Attempting to connect to chat for lesson:', lessonId);
    console.log('[LessonView] 🔌 WebSocket URL:', environment.wsUrl);
    console.log('[LessonView] 🔌 User ID:', userId, 'Tenant ID:', tenantId);
    
    this.wsService.connect();
    this.wsService.joinLesson(lessonId, userId, tenantId);
  }

  ngOnDestroy() {
    console.log('[LessonView] 🧹 Cleaning up lesson view resources...');
    
    // Remove event listeners
    window.removeEventListener('interaction-media-volume-changed', ((e: CustomEvent) => {}) as EventListener);
    window.removeEventListener('interaction-show-overlay-html', (() => {}) as EventListener);
    window.removeEventListener('interaction-hide-overlay-html', (() => {}) as EventListener);
    
    // Clear screenshot timeout if it exists
    if (this.screenshotTimeout) {
      clearTimeout(this.screenshotTimeout);
      this.screenshotTimeout = null;
    }
    // Clear general response timeout if it exists
    if (this.generalResponseTimeout) {
      clearTimeout(this.generalResponseTimeout);
      this.generalResponseTimeout = null;
    }
    
    // Clear screenshot-related state
    // Note: Screenshots are sent as base64 in WebSocket messages, not stored as files
    // So we just clear the state variables
    this.screenshotRequested = false;
    this.pendingScreenshotMessage = '';
    this.lastUserMessageBeforeScreenshot = '';
    this.screenshotFallbackTriggered = false;
    this.isTimeoutFallback = false;
    this.isSendingMessage = false;
    // Note: Screenshot is stored in ScreenshotStorageService and persists across components
    // It will be cleared when needed or replaced by the next screenshot
    
    console.log('[LessonView] ✅ Screenshot state cleared');
    
    // Clean up interaction blob URL
    if (this.interactionBlobUrl) {
      const url = (this.interactionBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
        console.log('[LessonView] ✅ Revoked interaction blob URL');
      }
      this.interactionBlobUrl = null;
    }
    
    // Clean up fullscreen class
    document.body.classList.remove('fullscreen-active');
    
    // Clean up FAB drag listeners
    this.stopFabDrag();
    
    // Stop timer
    this.stopTimer();
    
    // Clear auto-advance timeout
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
    }
    
    // Disconnect from WebSocket
    this.wsService.leaveLesson();
    this.wsService.disconnect();
    
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    window.removeEventListener('interaction-request-fullscreen', this.handleInteractionFullscreenRequest.bind(this) as EventListener);
    window.removeEventListener('interaction-request-show-widget', this.handleInteractionShowWidgetRequest.bind(this) as EventListener);
    window.removeEventListener('interaction-request-show-widget', this.handleInteractionShowWidgetRequest.bind(this) as EventListener);
  }

  toggleStage(stageId: number) {
    const wasExpanded = this.expandedStages.has(stageId);
    
    if (wasExpanded) {
      this.expandedStages.delete(stageId);
    } else {
      this.expandedStages.add(stageId);
      
      // If expanding, load the first sub-stage of this stage
      const stage = this.lessonStages.find(s => s.id === stageId);
      if (stage && stage.subStages && stage.subStages.length > 0) {
        const firstSubStage = stage.subStages[0];
        this.selectSubStage(stageId, firstSubStage.id);
      }
    }
  }

  selectSubStage(stageId: string | number, subStageId: string | number) {
    // Pause media player if switching substages
    if (this.mediaPlayerRef && this.mediaPlayerRef.isPlaying()) {
      this.mediaPlayerRef.pause();
      console.log('[LessonView] ⏸ Media player paused on substage switch');
    }
    
    // Pause script playback - defer to avoid change detection error
    setTimeout(() => {
      this.isScriptPlaying = false;
      this.interactionEnded = false; // Reset interaction ended flag
      this.cdr.detectChanges();
    }, 0);
    
    this.activeStageId = stageId;
    this.activeSubStageId = subStageId;
    this.isMobileNavOpen = false;
    
    // Save state to localStorage
    if (this.lesson) {
      this.saveLessonState(this.lesson.id.toString(), stageId, subStageId);
    }
    
    // Mark stage as viewed
    this.lessonStages = this.lessonStages.map(stage =>
      stage.id === stageId ? { ...stage, viewed: true } : stage
    );
    
    this.updateActiveSubStage();
    
    // Load interaction data if available
    this.loadInteractionData();
    
    // Check chat UI behavior for component-based interactions (like true-false-selection)
    // This needs to happen here because component-based interactions don't go through loadPixiJSHTMLIframeInteraction
    if (this.activeSubStage) {
      const config = (this.activeSubStage.interaction as any)?.config || {};
      const showAiTeacherUiOnLoad = config.showAiTeacherUiOnLoad;
      const configOpenChatUI = config.openChatUI;
      const configMinimizeChatUI = config.minimizeChatUI;
      
      // Check script block settings as fallback (only if interaction config doesn't specify)
      let shouldShowChatUI: boolean | null = null;
      if (showAiTeacherUiOnLoad === true) {
        shouldShowChatUI = true;
      } else if (showAiTeacherUiOnLoad === false) {
        shouldShowChatUI = false;
      } else if (configOpenChatUI === true) {
        shouldShowChatUI = true;
      } else if (configMinimizeChatUI === true) {
        shouldShowChatUI = false;
      } else {
        // Interaction config doesn't specify, check first script block
        const scriptBlocks = (this.activeSubStage as any)?.scriptBlocks || [];
        const firstScriptBlock = scriptBlocks.find((block: any) => block.type === 'teacher_talk' || block.type === 'load_interaction' || block.type === 'pause');
        if (firstScriptBlock) {
          if (firstScriptBlock.openChatUI === true) {
            shouldShowChatUI = true;
          } else if (firstScriptBlock.minimizeChatUI === true) {
            shouldShowChatUI = false;
          }
        }
      }
      
      // Apply chat UI state
      setTimeout(() => {
        if (this.teacherWidget) {
          if (shouldShowChatUI === true) {
            this.teacherWidget.openWidget();
            console.log('[LessonView] ✅ Showing AI Teacher UI on component interaction load (interaction config: showAiTeacherUiOnLoad=true or openChatUI=true)');
          } else if (shouldShowChatUI === false) {
            this.teacherWidget.minimize();
            console.log('[LessonView] ✅ Minimized AI Teacher UI on component interaction load (interaction config: showAiTeacherUiOnLoad=false or minimizeChatUI=true or script block: minimizeChatUI=true)');
          } else {
            // Default: minimize
            this.teacherWidget.minimize();
            console.log('[LessonView] ✅ Minimized AI Teacher UI on component interaction load (default behavior)');
          }
        }
      }, 100);
    }
    
    // Check if this is a media player interaction and if autoplay is disabled
    const isMediaInteraction = this.interactionBuild?.interactionTypeCategory === 'uploaded-media';
    const mediaConfig = this.interactionBuild?.mediaConfig || {};
    const instanceConfig = this.activeSubStage?.interaction?.config || {};
    const shouldAutoplay = instanceConfig.autoplay ?? mediaConfig.autoplay ?? false;
    
    // Play teacher script if available (or demo script for testing)
    // TODO: Get script from activeSubStage.script.before
    if (this.activeSubStage) {
      // Demo script for testing the widget
      this.playTeacherScript({
        text: `Welcome to ${this.activeSubStage.title || 'this sub-stage'}! Let me explain what we'll be learning here. This is a demonstration of the AI teacher script system. In production, these scripts will be defined in the lesson data and can be edited by lesson builders.`,
        estimatedDuration: 15
      }, null);
      
      // If media interaction and autoplay is false, pause the lesson after a short delay
      if (isMediaInteraction && !shouldAutoplay) {
        setTimeout(() => {
          if (this.isScriptPlaying) {
            this.onTeacherPause();
            console.log('[LessonView] ⏸ Lesson paused because media autoplay is disabled');
          }
        }, 500);
      }
    }
  }

  /**
   * Save lesson state to localStorage
   */
  private saveLessonState(lessonId: string, stageId: string | number, subStageId: string | number) {
    try {
      const state = {
        lessonId,
        stageId: String(stageId),
        subStageId: String(subStageId),
        timestamp: Date.now()
      };
      localStorage.setItem(`lesson-state-${lessonId}`, JSON.stringify(state));
      console.log('[LessonView] 💾 Saved lesson state:', state);
    } catch (error) {
      console.warn('[LessonView] Failed to save lesson state:', error);
    }
  }

  /**
   * Get saved lesson state from localStorage
   */
  private getSavedLessonState(lessonId: string): { stageId: string; subStageId: string } | null {
    try {
      const saved = localStorage.getItem(`lesson-state-${lessonId}`);
      if (saved) {
        const state = JSON.parse(saved);
        // Only restore if saved within last 7 days
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (Date.now() - state.timestamp < maxAge) {
          return { stageId: state.stageId, subStageId: state.subStageId };
        }
      }
    } catch (error) {
      console.warn('[LessonView] Failed to get saved lesson state:', error);
    }
    return null;
  }

  private updateActiveSubStage() {
    const stage = this.lessonStages.find(s => s.id === this.activeStageId);
    this.currentStage = stage || null;
    this.activeSubStage = stage?.subStages.find(ss => ss.id === this.activeSubStageId) || null;
    
    // Update normalized embedded interaction data
    const embeddedInteraction = this.getEmbeddedInteraction();
    if (embeddedInteraction?.config) {
      this.normalizedEmbeddedInteractionData = this.normalizeInteractionData(embeddedInteraction.config);
    } else {
      this.normalizedEmbeddedInteractionData = null;
    }
    
    // Initialize SDK for interaction if present
    if (this.activeSubStage && this.lesson?.id) {
      const interaction = this.activeSubStage.interaction || (this.activeSubStage as any).interactionType;
      if (interaction) {
        const interactionId = interaction.type || interaction.id || interaction;
        const processedContentId = this.normalizeContentOutputId(
          interaction.contentOutputId || (this.activeSubStage as any).contentOutputId
        );
        this.interactionAISDK.initialize(
          this.lesson.id,
          String(this.activeSubStage.id),
          interactionId,
          processedContentId || undefined,
        );
        
        // Initialize bridge service for iframe interactions
        this.bridgeService.initialize(
          this.lesson.id,
          String(this.activeSubStage.id),
          interactionId,
          processedContentId || undefined
        );
        
        // Set context for data storage SDK methods
        if (this.currentStage && this.activeSubStage) {
          const userId = environment.defaultUserId;
          const tenantId = environment.tenantId;
          const userRole = 'student'; // Default role, could be enhanced later
          this.interactionAISDK.setContext(
            this.lesson.id,
            String(this.currentStage.id),
            String(this.activeSubStage.id),
            interactionId,
            processedContentId || undefined,
            userId,
            tenantId,
            userRole
          );
        }
        
        // Set teacher widget reference for SDK (use setTimeout to ensure ViewChild is available)
        // Use a longer delay and retry logic to ensure widget is available, especially on mobile/first load
        setTimeout(() => {
          if (this.teacherWidget) {
            this.interactionAISDK.setTeacherWidgetRef(this.teacherWidget);
            console.log('[LessonView] ✅ Teacher widget reference set for SDK');
          } else {
            // Retry if widget not ready yet (common on mobile/first load)
            setTimeout(() => {
              if (this.teacherWidget) {
                this.interactionAISDK.setTeacherWidgetRef(this.teacherWidget);
                console.log('[LessonView] ✅ Teacher widget reference set for SDK (retry)');
              } else {
                // Only log as debug, not warning - widget may not be needed immediately and will be set when it initializes
                console.log('[LessonView] ℹ️ Teacher widget not yet available (will be set when widget initializes)');
              }
            }, 500);
          }
        }, 100);
        
        // Set media player reference for uploaded-media interactions
        if (this.interactionBuild?.interactionTypeCategory === 'uploaded-media') {
          setTimeout(() => {
            if (this.mediaPlayerRef) {
              this.interactionAISDK.setMediaPlayerRef(this.mediaPlayerRef);
              console.log('[LessonView] ✅ Media player reference set for SDK');
              
              // Check for autoplay when sub-stage is selected
              // Only attempt autoplay if lesson is already playing (user has interacted)
              const shouldAutoplay = this.mediaPlayerData?.config?.autoplay ?? false;
              if (shouldAutoplay && this.isScriptPlaying && !this.mediaPlayerRef.isPlaying()) {
                // Lesson is playing (user has clicked play), so we can attempt autoplay
                setTimeout(() => {
                  if (this.mediaPlayerRef && !this.mediaPlayerRef.isPlaying()) {
                    try {
                      this.mediaPlayerRef.play();
                      console.log('[LessonView] ▶️ Media started automatically (autoplay on sub-stage select, lesson playing)');
                    } catch (error) {
                      console.log('[LessonView] ℹ️ Autoplay blocked by browser:', error);
                    }
                  }
                }, 200);
              } else if (shouldAutoplay && !this.isScriptPlaying) {
                // Autoplay is enabled but lesson isn't playing yet
                // Media will start when user clicks play
                console.log('[LessonView] ℹ️ Media autoplay enabled - will start when lesson plays');
              }
            } else {
              // Retry if media player not ready yet
              setTimeout(() => {
                if (this.mediaPlayerRef) {
                  this.interactionAISDK.setMediaPlayerRef(this.mediaPlayerRef);
                  console.log('[LessonView] ✅ Media player reference set for SDK (retry)');
                  
                  // Check for autoplay on retry
                  const shouldAutoplay = this.mediaPlayerData?.config?.autoplay ?? false;
                  if (shouldAutoplay && !this.mediaPlayerRef.isPlaying()) {
                    if (!this.isScriptPlaying) {
                      this.onTeacherPlay();
                    }
                    setTimeout(() => {
                      if (this.mediaPlayerRef && !this.mediaPlayerRef.isPlaying()) {
                        try {
                          this.mediaPlayerRef.play();
                          console.log('[LessonView] ▶️ Media started automatically (autoplay on retry)');
                        } catch (error) {
                          console.log('[LessonView] ℹ️ Autoplay blocked by browser:', error);
                        }
                      }
                    }, 200);
                  }
                } else {
                  console.warn('[LessonView] ⚠️ Media player not available after retry');
                }
              }, 500);
            }
          }, 100);
        }
        
        console.log('[LessonView] ✅ Initialized AI SDK for interaction:', interactionId, 'processedContentId:', processedContentId);
      } else {
        // Clear SDK context if no interaction
        this.interactionAISDK.clearContext();
        this.bridgeService.destroy();
      }
    }
    
    // Clear any existing auto-advance timeout
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
    
    // If no interaction, auto-advance after script duration (checking auto-progress flag)
    if (!this.getEmbeddedInteraction() && this.activeSubStage) {
      const scriptDuration = this.calculateSubStageScriptDuration();
      const scriptBlocks = (this.activeSubStage as any)?.scriptBlocks || [];
      
      // Check if auto-progress is enabled (default to true)
      const shouldAutoProgress = scriptBlocks.every((script: any) => script.autoProgressAtEnd !== false);
      
      if (shouldAutoProgress) {
        this.autoAdvanceTimeout = setTimeout(() => {
          this.moveToNextSubStage();
        }, scriptDuration * 1000);
      } else {
        // Auto-progress disabled, show Next button after duration
        this.autoAdvanceTimeout = setTimeout(() => {
          this.interactionEnded = true;
          this.cdr.detectChanges();
          console.log('[LessonView] Script duration ended - waiting for user to click Next');
        }, scriptDuration * 1000);
      }
    }
  }
  
  /**
   * Calculate total script duration for current substage
   * For media interactions, if video duration is longer than allocated time, use video duration
   */
  private calculateSubStageScriptDuration(): number {
    if (!this.activeSubStage) return 5; // Default 5 seconds
    
    const scriptBlocks = (this.activeSubStage as any)?.scriptBlocks || [];
    const afterScripts = (this.activeSubStage as any)?.scriptBlocksAfterInteraction || [];
    
    const totalDuration = [...scriptBlocks, ...afterScripts].reduce(
      (sum, script) => sum + (script.estimatedDuration || 10),
      0
    );
    
    // For media interactions, check if video duration is longer than allocated time
    if (this.interactionBuild?.interactionTypeCategory === 'uploaded-media' && this.mediaPlayerRef) {
      const videoDuration = this.mediaPlayerRef.getDuration() || 0;
      if (videoDuration > 0 && videoDuration > totalDuration) {
        console.log(`[LessonView] Video duration (${videoDuration}s) is longer than allocated time (${totalDuration}s), using video duration`);
        return Math.max(5, videoDuration);
      }
    }
    
    // Minimum 5 seconds, use calculated duration
    return Math.max(5, totalDuration);
  }

  getEmbeddedInteraction(): any {
    // Check if activeSubStage has an embedded interaction (from JSON)
    const interaction = (this.activeSubStage as any)?.interaction || null;
    return interaction;
  }

  /**
   * Check if interaction config has valid data (fragments and targetStatement)
   */
  hasValidInteractionConfig(config: any): boolean {
    if (!config) return false;
    const normalized = this.normalizeInteractionData(config);
    return normalized && 
           normalized.fragments && 
           Array.isArray(normalized.fragments) && 
           normalized.fragments.length > 0 && 
           normalized.targetStatement && 
           normalized.targetStatement !== 'Loading...';
  }

  togglePassStatus() {
    if (this.activeStageId) {
      this.lessonStages = this.lessonStages.map(stage => {
        if (stage.id === this.activeStageId) {
          return { ...stage, passed: !stage.passed };
        }
        return stage;
      });
      this.updateActiveSubStage();
    }
  }

  startResize(event: MouseEvent) {
    event.preventDefault();
    this.isResizing = true;
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= this.minNavWidth && newWidth <= this.maxNavWidth) {
        this.navWidth = newWidth;
      }
    }
  }

  private handleMouseUp() {
    this.isResizing = false;
  }

  toggleNavCollapse() {
    if (this.navWidth > 0) {
      this.navWidthBeforeCollapse = this.navWidth;
      this.navWidth = 0;
    } else {
      this.navWidth = this.navWidthBeforeCollapse;
    }
  }

  openMobileNav() {
    this.isMobileNavOpen = true;
  }

  closeMobileNav() {
    this.isMobileNavOpen = false;
  }

  toggleMobileNav() {
    this.isMobileNavOpen = !this.isMobileNavOpen;
  }

  toggleSidebar() {
    // On mobile, toggle mobile nav
    // On desktop, toggle sidebar width
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      this.isMobileNavOpen = !this.isMobileNavOpen;
    } else {
      this.isSidebarOpen = !this.isSidebarOpen;
      this.navWidth = this.isSidebarOpen ? 280 : 0;
    }
  }

  toggleChatExpanded() {
    this.isChatExpanded = !this.isChatExpanded;
  }

  sendMessage() {
    if (this.chatMessage.trim()) {
      console.log('[LessonView] Sending message via WebSocket:', this.chatMessage);
      
      // Expand chat when user sends message
      this.isChatExpanded = true;
      
      // Send message through WebSocket (it will handle adding to chatMessages)
      this.wsService.sendMessage(this.chatMessage);
      
      // Clear input
      this.chatMessage = '';
    }
  }

  toggleMyList() {
    if (this.lesson) {
      console.log('[LessonView] Toggle my list for:', this.lesson.title);
      this.lessonService.toggleMyList(this.lesson);
    }
  }

  isInMyList(): boolean {
    if (!this.lesson) return false;
    return this.lessonService.isInMyList(this.lesson.id);
  }

  exitLesson() {
    this.lessonService.exitLessonView();
    this.router.navigate(['/home']);
  }

  /**
   * Normalize interaction data to match component expectations
   */
  normalizeInteractionData(rawData: any): any {
    if (!rawData) {
      return null;
    }
    
    // If it's already in the correct format with required fields, return as-is
    if (rawData.fragments && Array.isArray(rawData.fragments) && rawData.fragments.length > 0 && rawData.targetStatement) {
      return rawData;
    }
    
    // Try to extract from nested structures
    const fragments = rawData.fragments || rawData.data?.fragments || rawData.config?.fragments || rawData.sampleData?.fragments || [];
    const targetStatement = rawData.targetStatement || rawData.data?.targetStatement || rawData.config?.targetStatement || rawData.sampleData?.targetStatement || '';
    
    const normalized: any = {
      fragments: Array.isArray(fragments) ? fragments : [],
      targetStatement: targetStatement || 'Loading...',
      maxFragments: rawData.maxFragments || rawData.data?.maxFragments || rawData.config?.maxFragments || 10,
      showHints: rawData.showHints !== undefined ? rawData.showHints : (rawData.data?.showHints !== undefined ? rawData.data.showHints : (rawData.config?.showHints !== undefined ? rawData.config.showHints : false))
    };
    
    // Preserve interactionTypeId if present
    if (rawData.interactionTypeId) {
      normalized.interactionTypeId = rawData.interactionTypeId;
    }
    
    // Removed verbose logging - only log if explicitly needed for debugging
    // if (environment.logLevel === 'debug') {
    //   console.log('[LessonView] Normalized interaction data:', {
    //     fragmentsCount: normalized.fragments.length,
    //     targetStatement: normalized.targetStatement,
    //     maxFragments: normalized.maxFragments,
    //     showHints: normalized.showHints
    //   });
    // }
    
    return normalized;
  }

  /**
   * Load interaction data for the active sub-stage
   */
  private loadInteractionData() {
    // Reset state
    this.interactionData = null;
    this.interactionScore = null;
    this.normalizedInteractionData = null;
    this.normalizedEmbeddedInteractionData = null;
    
    const subStage = this.activeSubStage;
    if (!subStage) {
      console.warn('[LessonView] No active sub-stage to load interaction data for');
      return;
    }

    // Get interaction type from sub-stage
    const interaction = subStage.interaction || (subStage as any).interactionType;
    const interactionTypeId = interaction?.type || interaction?.id || interaction;
    
    // Don't clear interactionBuild or mediaPlayerData if we're already on the same media interaction
    // This prevents the player from disappearing during playback
    const isCurrentlyMediaInteraction = this.interactionBuild?.interactionTypeCategory === 'uploaded-media' || 
                                        this.interactionBuild?.interactionTypeCategory === 'video-url';
    const currentSubStageId = this.activeSubStage?.id;
    const isSameMediaInteraction = isCurrentlyMediaInteraction && 
                                   currentSubStageId === subStage.id &&
                                   this.interactionBuild?.id === interactionTypeId;
    
    if (!isSameMediaInteraction) {
      // Only clear if not the same media/video-url interaction
      this.interactionBuild = null;
      this.mediaPlayerData = null;
      this.videoUrlPlayerData = null;
      // Clear cached HTML when clearing video URL data
      this.cachedVideoUrlSectionHtml = null;
      this.isMediaPlayerReady = false;
    }
    
    this.interactionBlobUrl = null;
    this.interactionError = null;
    
    // Check if this is an uploaded-media interaction
    if (interactionTypeId) {
      // If we're already on the same media interaction, don't reload it
      if (isSameMediaInteraction) {
        console.log('[LessonView] Already on same media interaction, skipping reload');
        this.isLoadingInteraction = false;
        return;
      }
      
      // Set loading state
      this.isLoadingInteraction = true;
      
      // First, fetch the interaction build to check its category
      // Use a more aggressive cache buster to ensure we get the latest code
      const cacheBuster = `?t=${Date.now()}&v=${Math.random()}`;
      this.http.get(`${environment.apiUrl}/interaction-types/${interactionTypeId}${cacheBuster}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (build: any) => {
            console.log('[LessonView] ✅ Loaded interaction build:', build.id, 'Category:', build.interactionTypeCategory);
            // Check if this is an uploaded-media or video-url interaction
            if (build.interactionTypeCategory === 'uploaded-media') {
              console.log('[LessonView] 🎬 Detected uploaded-media interaction, loading media player data');
              this.loadMediaPlayerData(build, subStage);
              return;
            }

            if (build.interactionTypeCategory === 'video-url') {
              console.log('[LessonView] 🎬 Detected video-url interaction, loading video URL player data');
              this.loadVideoUrlPlayerData(build, subStage);
              return;
            }
            
            // Otherwise, continue with normal PixiJS/HTML/iframe loading
            console.log('[LessonView] Loading PixiJS/HTML/iframe interaction');
            this.loadPixiJSHTMLIframeInteraction(build, subStage);
          },
          error: (error) => {
            console.error('[LessonView] ❌ Failed to load interaction build:', error);
            this.isLoadingInteraction = false;
          }
        });
      return;
    }

    const fetchFromOutput = (contentOutputId: string) => {
      // Validate ID before making request
      if (!contentOutputId || contentOutputId.startsWith('40000000-0000-0000-0000-') || 
          isDefaultLessonId(contentOutputId)) {
        console.warn('[LessonView] Skipping invalid/placeholder contentOutputId:', contentOutputId);
        this.isLoadingInteraction = false;
        return;
      }
      
      console.log('[LessonView] 🔍 Loading interaction data for contentOutputId:', contentOutputId);
      console.log('[LessonView] 📍 Sub-stage:', subStage.title, '| Interaction type:', subStage.interaction?.type);
      
      this.isLoadingInteraction = true;

      this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${contentOutputId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (output: any) => {
            console.log('[LessonView] Loaded interaction data (raw):', output);
            
            let rawData: any = null;
            
            // Check for rankedInteractions structure (new LLM format)
            if (output.outputData && output.outputData.rankedInteractions && Array.isArray(output.outputData.rankedInteractions)) {
              // Find the interaction matching the outputType
              const matchingInteraction = output.outputData.rankedInteractions.find(
                (interaction: any) => interaction.id === output.outputType || interaction.id === 'true-false-selection'
              );
              
              if (matchingInteraction && matchingInteraction.inputData) {
                rawData = {
                  ...matchingInteraction.inputData,
                  interactionTypeId: matchingInteraction.id || output.outputType,
                  confidence: matchingInteraction.confidence,
                  _sourceFormat: 'rankedInteractions' // Flag to identify format
                };
                console.log('[LessonView] ✅ Using NEW rankedInteractions format');
                console.log('[LessonView] Extracted data from rankedInteractions:', {
                  interactionId: matchingInteraction.id,
                  confidence: matchingInteraction.confidence,
                  fragmentsCount: matchingInteraction.inputData.fragments?.length || 0,
                  targetStatement: matchingInteraction.inputData.targetStatement
                });
              } else if (output.outputData && output.outputData.rankedInteractions) {
                console.warn('[LessonView] ⚠️ rankedInteractions found but no matching interaction for outputType:', output.outputType);
              }
            }
            
            // Fallback: Check for direct interactionTypeId (old format)
            if (!rawData && output.outputData && output.outputData.interactionTypeId) {
              rawData = {
                ...output.outputData,
                interactionTypeId: output.outputData.interactionTypeId,
                _sourceFormat: 'direct' // Flag to identify format
              };
              console.warn('[LessonView] ⚠️ Using FALLBACK: direct outputData structure (old format)');
            }
            
            // Fallback: Check for statements array (legacy format)
            if (!rawData && output.outputData && output.outputType === 'true-false-selection') {
              const fragments = (output.outputData.statements || []).map((stmt: any) => ({
                text: stmt.text,
                isTrueInContext: stmt.isTrue,
                explanation: stmt.explanation || ''
              }));
              rawData = {
                fragments,
                targetStatement: output.outputName || 'True or False?',
                interactionTypeId: 'true-false-selection',
                _sourceFormat: 'legacy-statements' // Flag to identify format
              };
              console.warn('[LessonView] ⚠️ Using FALLBACK: legacy statements format');
            }
            
            // Fallback: Try to extract from nested structures
            if (!rawData && output.outputData) {
              rawData = {
                ...output.outputData,
                _sourceFormat: 'raw-fallback' // Flag to identify format
              };
              console.warn('[LessonView] ⚠️ Using FALLBACK: raw outputData (last resort)');
            }
            
            if (rawData) {
              this.interactionData = rawData;
              this.normalizedInteractionData = this.normalizeInteractionData(rawData);
              
              // Log format being used for verification
              const formatUsed = rawData._sourceFormat || 'unknown';
              const isNewFormat = formatUsed === 'rankedInteractions';
              
              console.log('[LessonView] ✅ Interaction data loaded successfully');
              console.log('[LessonView] 📊 Data source format:', formatUsed);
              console.log('[LessonView] ' + (isNewFormat ? '✅' : '⚠️') + ' Using ' + (isNewFormat ? 'NEW' : 'FALLBACK') + ' format');
              console.log('[LessonView] Normalized interaction data:', {
                fragmentsCount: this.normalizedInteractionData?.fragments?.length || 0,
                targetStatement: this.normalizedInteractionData?.targetStatement,
                hasFragments: !!this.normalizedInteractionData?.fragments,
                sourceFormat: formatUsed,
                contentOutputId: contentOutputId
              });
            } else {
              console.warn('[LessonView] ❌ No interaction data found in output:', output);
            }
            
            this.isLoadingInteraction = false;
          },
          error: (error) => {
            // Only log 404 errors as warnings, not errors (they're expected for invalid IDs)
            if (error.status === 404) {
              console.warn('[LessonView] Processed output not found (404):', contentOutputId, '- This may be a placeholder ID');
            } else {
              console.error('[LessonView] Error loading interaction data:', error);
            }
            this.isLoadingInteraction = false;
          }
        });
    };

    const existingContentOutputId = this.normalizeContentOutputId(subStage.contentOutputId);
    if (existingContentOutputId) {
      fetchFromOutput(existingContentOutputId);
      return;
    }

    this.isLoadingInteraction = true;
    this.ensureContentOutputForActiveSubstage()
      .then((resolvedId) => {
        if (resolvedId) {
          fetchFromOutput(resolvedId);
        } else {
          console.warn('[LessonView] No processed content mapped to this sub-stage');
          this.isLoadingInteraction = false;
        }
      })
      .catch(err => {
        console.error('[LessonView] Failed to resolve processed content for sub-stage:', err);
        this.isLoadingInteraction = false;
      });
  }

  // Helper method to load PixiJS/HTML/iframe interactions
  private loadPixiJSHTMLIframeInteraction(build: any | null, subStage: SubStage) {
    const interaction = subStage.interaction || (subStage as any).interactionType;
    const interactionTypeId = interaction?.type || interaction?.id || interaction;
    console.log('[LessonView] 🔍 Loading interaction for sub-stage:', {
      interactionTypeId,
      interaction,
      subStageId: subStage.id
    });
    
    if (!build) {
        // Fetch interaction build from API (with cache-busting to ensure we get latest code)
        const cacheBuster = `?t=${Date.now()}`;
        this.http.get(`${environment.apiUrl}/interaction-types/${interactionTypeId}${cacheBuster}`)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (fetchedBuild: any) => {
              console.log('[LessonView] 📥 Fetched interaction build from API:', fetchedBuild.id);
              console.log('[LessonView] 📥 Fetched iframeConfig:', JSON.stringify(fetchedBuild.iframeConfig, null, 2));
              console.log('[LessonView] 📥 HTML Code length:', fetchedBuild.htmlCode?.length || 0);
              console.log('[LessonView] 📥 HTML Code includes input:', fetchedBuild.htmlCode?.includes('image-prompt-input') || false);
              console.log('[LessonView] 📥 CSS Code length:', fetchedBuild.cssCode?.length || 0);
              this.loadPixiJSHTMLIframeInteraction(fetchedBuild, subStage);
            },
            error: (error) => {
              console.error('[LessonView] ❌ Failed to load interaction build:', error);
              this.isLoadingInteraction = false;
            }
          });
        return;
      }
      
      console.log('[LessonView] ✅ Loaded interaction build:', build.id);
      console.log('[LessonView] 📝 HTML code length:', build.htmlCode?.length || 0);
      console.log('[LessonView] 📝 HTML code includes input:', build.htmlCode?.includes('image-prompt-input') || false);
      console.log('[LessonView] 📝 CSS code length:', build.cssCode?.length || 0);
      console.log('[LessonView] 📝 JS code length:', build.jsCode?.length || 0);
      console.log('[LessonView] 📝 JS code includes "Show Snack":', build.jsCode?.includes('Show Snack') || false);
      console.log('[LessonView] 🎛️ iFrame overlayMode:', build.iframeConfig?.overlayMode || 'overlay (default)');
      console.log('[LessonView] 🎛️ Full iframeConfig:', JSON.stringify(build.iframeConfig, null, 2));
      this.interactionBuild = build;
      
      // Check chat UI behavior on load - interaction config takes precedence, then script block settings
      const config = (subStage.interaction as any)?.config || {};
      const showAiTeacherUiOnLoad = config.showAiTeacherUiOnLoad;
      const configOpenChatUI = config.openChatUI;
      const configMinimizeChatUI = config.minimizeChatUI;
      
      // Check script block settings as fallback (only if interaction config doesn't specify)
      let shouldShowChatUI: boolean | null = null;
      if (showAiTeacherUiOnLoad === true) {
        shouldShowChatUI = true;
      } else if (showAiTeacherUiOnLoad === false) {
        shouldShowChatUI = false;
      } else if (configOpenChatUI === true) {
        shouldShowChatUI = true;
      } else if (configMinimizeChatUI === true) {
        shouldShowChatUI = false;
      } else {
        // Interaction config doesn't specify, check first script block
        const scriptBlocks = (subStage as any)?.scriptBlocks || [];
        const firstScriptBlock = scriptBlocks.find((block: any) => block.type === 'teacher_talk' || block.type === 'load_interaction' || block.type === 'pause');
        if (firstScriptBlock) {
          if (firstScriptBlock.openChatUI === true) {
            shouldShowChatUI = true;
          } else if (firstScriptBlock.minimizeChatUI === true) {
            shouldShowChatUI = false;
          }
        }
      }
      
      // Minimize AI Teacher UI when interaction loads unless explicitly configured to show
      // Use setTimeout to ensure teacherWidget is initialized
      setTimeout(() => {
        if (this.teacherWidget) {
          if (shouldShowChatUI === true) {
            this.teacherWidget.openWidget();
            console.log('[LessonView] ✅ Showing AI Teacher UI on interaction load (interaction config: showAiTeacherUiOnLoad=true)');
          } else if (shouldShowChatUI === false) {
            this.teacherWidget.minimize();
            console.log('[LessonView] ✅ Minimized AI Teacher UI on interaction load (interaction config: showAiTeacherUiOnLoad=false or script block: minimizeChatUI=true)');
          } else {
            // Default: minimize
            this.teacherWidget.minimize();
            console.log('[LessonView] ✅ Minimized AI Teacher UI on interaction load (default behavior)');
          }
        }
      }, 100);
      
      // Check for processed output (PixiJS/HTML interactions can use processed outputs, but it's optional)
      const processedContentId = this.normalizeContentOutputId(
        subStage.contentOutputId || (subStage.interaction as any)?.contentOutputId
      );
      
      if (!processedContentId) {
        // No processed content - use sample data (no error, interactions can work without processed content)
        console.log('[LessonView] ℹ️ No processed content found, using sample data from interaction build');
        this.interactionPreviewKey++; // Force iframe recreation
        this.createInteractionBlobUrl();
        this.isLoadingInteraction = false;
        
        // Send SDK ready message after iframe is created
        setTimeout(() => {
          this.sendSDKReadyToIframe();
        }, 500);
        return;
      }
      
      // Processed content ID exists - fetch it (if it fails, show error since it was expected)
      this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${processedContentId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (output: any) => {
            console.log('[LessonView] ✅ Loaded processed output for interaction:', processedContentId);
            
            // Validate processed output has data
            const processedData = output.outputData;
            if (!processedData || typeof processedData !== 'object' || Object.keys(processedData).length === 0) {
              console.error('[LessonView] ❌ Processed output has no data or invalid format');
              this.interactionError = 'The processed content for this interaction is empty or invalid. The processed content must be a valid JSON object with data. Please regenerate the processed content from the content source.';
              this.isLoadingInteraction = false;
              return;
            }
            
            // Normalize data structure for True/False interactions (extract from rankedInteractions if needed)
            let normalizedData = processedData;
            if (build.id === 'true-false-selection' && processedData.rankedInteractions && Array.isArray(processedData.rankedInteractions)) {
              const matchingInteraction = processedData.rankedInteractions.find(
                (interaction: any) => interaction.id === 'true-false-selection' || interaction.id === build.id
              );
              if (matchingInteraction && matchingInteraction.inputData) {
                normalizedData = matchingInteraction.inputData;
                console.log('[LessonView] ✅ Normalized data from rankedInteractions for True/False interaction');
              }
            }
            
            // Use processed content (replace sample data)
            this.interactionBuild = { ...build, sampleData: normalizedData };
            this.interactionPreviewKey++; // Force iframe recreation
            this.createInteractionBlobUrl();
            this.isLoadingInteraction = false;
            
            // Send SDK ready message after iframe is created
            setTimeout(() => {
              this.sendSDKReadyToIframe();
            }, 500);
          },
          error: (error) => {
            console.error('[LessonView] ❌ Failed to load processed output:', error);
            // Only show error if processed content was expected (contentOutputId was set)
            if (error.status === 404) {
              this.interactionError = 'Processed content not found. A processed content ID was associated with this interaction, but the content could not be found. Please ensure processed content has been generated and is correctly associated with this substage.';
            } else {
              this.interactionError = `Failed to load processed content: ${error.message || 'Unknown error'}. Please check the processed content configuration.`;
            }
            this.isLoadingInteraction = false;
          }
        });
  }

  // Helper method to load media player data for uploaded-media interactions
  private loadMediaPlayerData(build: any, subStage: SubStage) {
    console.log('[LessonView] 🎬 Loading media player data for uploaded-media interaction');
    console.log('[LessonView] 🎬 Build ID:', build.id, 'SubStage ID:', subStage.id);
    
    // Check chat UI behavior on load - interaction config takes precedence, then script block settings
    const config = (subStage.interaction as any)?.config || {};
    const showAiTeacherUiOnLoad = config.showAiTeacherUiOnLoad;
    
    // Check script block settings as fallback (only if interaction config doesn't specify)
    let shouldShowChatUI: boolean | null = null;
    if (showAiTeacherUiOnLoad === true) {
      shouldShowChatUI = true;
    } else if (showAiTeacherUiOnLoad === false) {
      shouldShowChatUI = false;
    } else {
      // Interaction config doesn't specify, check first script block
      const scriptBlocks = (subStage as any)?.scriptBlocks || [];
      const firstScriptBlock = scriptBlocks.find((block: any) => block.type === 'teacher_talk' || block.type === 'load_interaction' || block.type === 'pause');
      if (firstScriptBlock) {
        if (firstScriptBlock.openChatUI === true) {
          shouldShowChatUI = true;
        } else if (firstScriptBlock.minimizeChatUI === true) {
          shouldShowChatUI = false;
        }
      }
    }
    
    // Minimize AI Teacher UI when interaction loads unless explicitly configured to show
    setTimeout(() => {
      if (this.teacherWidget) {
        if (shouldShowChatUI === true) {
          this.teacherWidget.openWidget();
          console.log('[LessonView] ✅ Showing AI Teacher UI on media interaction load (interaction config: showAiTeacherUiOnLoad=true)');
        } else if (shouldShowChatUI === false) {
          this.teacherWidget.minimize();
          console.log('[LessonView] ✅ Minimized AI Teacher UI on media interaction load (interaction config: showAiTeacherUiOnLoad=false or script block: minimizeChatUI=true)');
        } else {
          // Default: minimize
          this.teacherWidget.minimize();
          console.log('[LessonView] ✅ Minimized AI Teacher UI on media interaction load (default behavior)');
        }
      }
    }, 100);
    
    this.isLoadingInteraction = true;
    // Don't clear mediaPlayerData immediately - wait until we have new data
    // This prevents the player from disappearing during reload
    this.isMediaPlayerReady = false; // Reset ready flag
    this.interactionBuild = build; // Store build for reference
    
    // Get processed content ID from config
    const processedContentId = this.normalizeContentOutputId(
      subStage.contentOutputId || (subStage.interaction as any)?.contentOutputId || (subStage.interaction as any)?.config?.contentOutputId
    );
    
    if (!processedContentId) {
      console.warn('[LessonView] ❌ No processed content ID found for uploaded-media interaction');
      this.interactionError = 'No media content selected for this interaction. Please select media content in the lesson editor.';
      this.isLoadingInteraction = false;
      return;
    }
    
    // Fetch processed output (which contains media file URL and metadata)
    this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${processedContentId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (output: any) => {
          console.log('[LessonView] ✅ Loaded processed output for media:', processedContentId);
          
          // Extract media data from processed output
          const outputData = output.outputData || {};
          const mediaType = outputData.mediaFileType || outputData.mediaType || 'video';
          
          // Use the processed content endpoint to serve the media file
          // This ensures proper MIME type headers and file serving
          const fullMediaUrl = `${environment.apiUrl}/content-sources/processed-content/${processedContentId}/file`;
          
          console.log('[LessonView] 🎬 Constructed media URL:', fullMediaUrl);
          console.log('[LessonView] 🎬 Media type:', mediaType);
          
          // Get media config from interaction build or use defaults
          const mediaConfig = build.mediaConfig || {};
          const config = subStage.interaction?.config || {};
          
          // Extract overlay code from interaction build
          const overlayHtml = build.htmlCode || '';
          const overlayCss = build.cssCode || '';
          const overlayJs = build.jsCode || '';
          
          // Get display mode (overlay vs section) from mediaConfig
          const displayMode = mediaConfig.displayMode || 'overlay';
          
          // Set media player data immediately (don't defer)
          this.mediaPlayerData = {
            mediaUrl: fullMediaUrl,
            mediaType: mediaType as 'video' | 'audio',
            config: {
              autoplay: config.autoplay ?? mediaConfig.autoplay ?? false,
              loop: false, // Never loop - we handle progression manually based on auto-progress setting
              showControls: config.showControls ?? mediaConfig.showControls ?? false, // Default: hide controls
              defaultVolume: config.defaultVolume ?? mediaConfig.defaultVolume ?? 1,
              startTime: config.startTime,
              endTime: config.endTime,
              hideOverlayDuringPlayback: config.hideOverlayDuringPlayback ?? mediaConfig.hideOverlayDuringPlayback ?? true, // Default: hide overlay during playback
              displayMode, // Store display mode for conditional rendering
            },
            // Only pass overlay code if displayMode is 'overlay', otherwise render as section below
            overlayHtml: displayMode === 'overlay' ? overlayHtml : '',
            overlayCss: displayMode === 'overlay' ? overlayCss : '',
            overlayJs: displayMode === 'overlay' ? overlayJs : '',
            // Store section code separately for section mode
            sectionHtml: displayMode === 'section' ? overlayHtml : '',
            sectionCss: displayMode === 'section' ? overlayCss : '',
            sectionJs: displayMode === 'section' ? overlayJs : '',
            displayMode,
            sectionHeight: mediaConfig.sectionHeight || 'auto',
            sectionMinHeight: mediaConfig.sectionMinHeight || '200px',
            sectionMaxHeight: mediaConfig.sectionMaxHeight || 'none',
          };
          
          console.log('[LessonView] ✅ Media player data loaded:', {
            mediaUrl: fullMediaUrl,
            mediaType,
            hasOverlay: !!(overlayHtml || overlayCss || overlayJs),
            hasMediaPlayerData: !!this.mediaPlayerData,
            interactionBuildCategory: this.interactionBuild?.interactionTypeCategory,
          });
          
          this.isLoadingInteraction = false;
          
          // Update ready flag in next microtask to avoid change detection issues
          queueMicrotask(() => {
            this.isMediaPlayerReady = !!(this.mediaPlayerRef && this.mediaPlayerData);
            console.log('[LessonView] 🎬 Media player ready state:', {
              isMediaPlayerReady: this.isMediaPlayerReady,
              hasMediaPlayerRef: !!this.mediaPlayerRef,
              hasMediaPlayerData: !!this.mediaPlayerData,
            });
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          console.error('[LessonView] ❌ Failed to load processed output for media:', error);
          if (error.status === 404) {
            this.interactionError = 'Media content not found. The processed content associated with this interaction could not be found.';
          } else {
            this.interactionError = `Failed to load media content: ${error.message || 'Unknown error'}`;
          }
          this.isLoadingInteraction = false;
        }
      });
  }

  // Helper method to load video URL player data for video-url interactions
  private loadVideoUrlPlayerData(build: any, subStage: SubStage) {
    console.log('[LessonView] 🎬 Loading video URL player data for video-url interaction');
    console.log('[LessonView] 🎬 Build ID:', build.id, 'SubStage ID:', subStage.id);
    
    // Check chat UI behavior on load - interaction config takes precedence, then script block settings
    const config = (subStage.interaction as any)?.config || {};
    const showAiTeacherUiOnLoad = config.showAiTeacherUiOnLoad;
    
    // Check script block settings as fallback (only if interaction config doesn't specify)
    let shouldShowChatUI: boolean | null = null;
    if (showAiTeacherUiOnLoad === true) {
      shouldShowChatUI = true;
    } else if (showAiTeacherUiOnLoad === false) {
      shouldShowChatUI = false;
    } else {
      // Interaction config doesn't specify, check first script block
      const scriptBlocks = (subStage as any)?.scriptBlocks || [];
      const firstScriptBlock = scriptBlocks.find((block: any) => block.type === 'teacher_talk' || block.type === 'load_interaction' || block.type === 'pause');
      if (firstScriptBlock) {
        if (firstScriptBlock.openChatUI === true) {
          shouldShowChatUI = true;
        } else if (firstScriptBlock.minimizeChatUI === true) {
          shouldShowChatUI = false;
        }
      }
    }
    
    // Minimize AI Teacher UI when interaction loads unless explicitly configured to show
    setTimeout(() => {
      if (this.teacherWidget) {
        if (shouldShowChatUI === true) {
          this.teacherWidget.openWidget();
          console.log('[LessonView] ✅ Showing AI Teacher UI on video URL interaction load (interaction config: showAiTeacherUiOnLoad=true)');
        } else if (shouldShowChatUI === false) {
          this.teacherWidget.minimize();
          console.log('[LessonView] ✅ Minimized AI Teacher UI on video URL interaction load (interaction config: showAiTeacherUiOnLoad=false or script block: minimizeChatUI=true)');
        } else {
          // Default: minimize
          this.teacherWidget.minimize();
          console.log('[LessonView] ✅ Minimized AI Teacher UI on video URL interaction load (default behavior)');
        }
      }
    }, 100);
    
    this.isLoadingInteraction = true;
    this.interactionBuild = build;

    // Get processed content ID from config / substage
    const processedContentId = this.normalizeContentOutputId(
      subStage.contentOutputId || (subStage.interaction as any)?.contentOutputId || (subStage.interaction as any)?.config?.contentOutputId
    );

    if (!processedContentId) {
      console.warn('[LessonView] ❌ No processed content ID found for video-url interaction');
      this.interactionError = 'No video content selected for this interaction. Please select a processed YouTube/Vimeo URL in the lesson editor.';
      this.isLoadingInteraction = false;
      return;
    }

    // Fetch processed output (contains URL metadata)
    this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${processedContentId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (output: any) => {
          console.log('[LessonView] ✅ Loaded processed output for video URL:', processedContentId);

          const outputData = output.outputData || {};
          const url = outputData.url || outputData.sourceUrl || output.contentSource?.sourceUrl;

          // Determine provider from URL or videoUrlConfig
          const configFromInteraction = (build as any).videoUrlConfig || {};
          let provider: 'youtube' | 'vimeo' | 'unknown' = configFromInteraction.provider || 'unknown';
          let videoId: string | undefined = configFromInteraction.videoId;

          if (url) {
            const urlLower = url.toLowerCase();
            const isYouTube = urlLower.includes('youtube.com') || urlLower.includes('youtu.be');
            const isVimeo = urlLower.includes('vimeo.com');

            if (isYouTube) {
              provider = 'youtube';
              if (!videoId) {
                const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                videoId = match ? match[1] : undefined;
              }
            } else if (isVimeo) {
              provider = 'vimeo';
              if (!videoId) {
                const match = url.match(/(?:vimeo\.com\/)(\d+)/);
                videoId = match ? match[1] : undefined;
              }
            }
          }

          if (!url || !videoId || provider === 'unknown') {
            console.warn('[LessonView] ❌ Could not determine provider or videoId for video-url interaction', { url, provider, videoId });
            this.interactionError = 'Invalid video URL configuration. Please ensure the processed content is a valid YouTube or Vimeo URL.';
            this.isLoadingInteraction = false;
            return;
          }

          // Build config for VideoUrlPlayerComponent
          const substageConfig = subStage.interaction?.config || {};
          // Check playVideoOnLoad first (explicit setting), then default to false
          // Only use playVideoOnLoad - don't fall back to autoplay
          // Must be explicitly true (strict check)
          const playVideoOnLoad = substageConfig.playVideoOnLoad === true || (configFromInteraction.playVideoOnLoad === true);
          const autoplay = playVideoOnLoad; // Use playVideoOnLoad setting for autoplay (must be explicitly true)
          
          console.log('[LessonView] 🎬 Video URL autoplay config:', {
            substageConfigPlayVideoOnLoad: substageConfig.playVideoOnLoad,
            configFromInteractionPlayVideoOnLoad: configFromInteraction.playVideoOnLoad,
            playVideoOnLoad,
            autoplay
          });
          const loop = substageConfig.loop ?? configFromInteraction.loop ?? false;
          const defaultVolume = substageConfig.defaultVolume ?? configFromInteraction.defaultVolume ?? 1;
          const showCaptions = substageConfig.showCaptions ?? configFromInteraction.showCaptions ?? false;
          const videoQuality = substageConfig.videoQuality ?? configFromInteraction.videoQuality ?? 'auto';
          const startTime = substageConfig.startTime ?? configFromInteraction.startTime;
          const endTime = substageConfig.endTime ?? configFromInteraction.endTime;
          const hideOverlayDuringPlayback = substageConfig.hideOverlayDuringPlayback ?? configFromInteraction.hideOverlayDuringPlayback ?? true;

          // Overlay/section code from interaction build
          const overlayHtml = build.htmlCode || '';
          const overlayCss = build.cssCode || '';
          const overlayJs = build.jsCode || '';
          
          // Debug: Log jsCode length to check for truncation
          console.log('[LessonView] 📝 Video URL jsCode length:', overlayJs.length);
          if (overlayJs.length < 100) {
            console.warn('[LessonView] ⚠️ Video URL jsCode is suspiciously short! First 200 chars:', overlayJs.substring(0, 200));
          }

          // Determine display mode, enforcing section mode for YouTube/Vimeo
          let displayMode: 'overlay' | 'section' = (configFromInteraction.displayMode as any) || 'section';
          if ((provider === 'youtube' || provider === 'vimeo') && displayMode === 'overlay') {
            console.log('[LessonView] ⚠️ Overlay mode not allowed for YouTube/Vimeo. Forcing section mode.');
            displayMode = 'section';
          }

          // Ensure URL is included in processedContentData for AI context
          const processedContentDataWithUrl = {
            ...outputData,
            url: url || outputData.url || outputData.sourceUrl,
            sourceUrl: url || outputData.url || outputData.sourceUrl,
          };

          this.videoUrlPlayerData = {
            config: {
              provider,
              videoId,
              videoUrl: url,
              autoplay,
              loop,
              defaultVolume,
              showCaptions,
              videoQuality,
              startTime,
              endTime,
              hideOverlayDuringPlayback,
            },
            overlayHtml: displayMode === 'overlay' ? overlayHtml : '',
            overlayCss: displayMode === 'overlay' ? overlayCss : '',
            overlayJs: displayMode === 'overlay' ? overlayJs : '',
            sectionHtml: displayMode === 'section' ? overlayHtml : '',
            sectionCss: displayMode === 'section' ? overlayCss : '',
            sectionJs: displayMode === 'section' ? overlayJs : '',
            displayMode,
            sectionHeight: configFromInteraction.sectionHeight || 'auto',
            sectionMinHeight: configFromInteraction.sectionMinHeight || '200px',
            sectionMaxHeight: configFromInteraction.sectionMaxHeight || 'none',
            processedContentData: processedContentDataWithUrl, // Store processed output data with URL for AI context
          };

          console.log('[LessonView] ✅ Video URL player data loaded:', {
            provider,
            videoId,
            url,
            displayMode,
          });

          this.isLoadingInteraction = false;
          
          // Clear cached HTML when loading new video URL data (to allow re-initialization)
          this.cachedVideoUrlSectionHtml = null;
          
          // Store player reference globally for SDK access
          (window as any).__videoUrlPlayerRef = this.videoUrlPlayerRef;
          
          // Check for autoplay/playVideoOnLoad - use the same logic as when building config
          const config = (this.activeSubStage as any)?.interaction?.config || {};
          // Only play if playVideoOnLoad is explicitly set to true (strict check)
          const playOnLoad = config.playVideoOnLoad === true || (configFromInteraction.playVideoOnLoad === true);
          
          // Execute section JS and send SDK ready after view update
          // Use queueMicrotask to ensure Angular's change detection has completed
          queueMicrotask(() => {
            setTimeout(() => {
              this.executeVideoUrlSectionJs();
              this.sendSDKReadyToVideoUrlSection();
              
              // Auto-play if configured (after player is ready)
              // Only play if playVideoOnLoad is explicitly set to true
              if (playOnLoad === true) {
                setTimeout(() => {
                  if (this.videoUrlPlayerRef && this.isVideoUrlReady) {
                    this.videoUrlPlayerRef.playVideoUrl();
                  }
                }, 500);
              }
            }, 200); // Increased delay to ensure DOM is ready
          });
        },
        error: (error) => {
          console.error('[LessonView] ❌ Failed to load processed output for video URL:', error);
          if (error.status === 404) {
            this.interactionError = 'Video content not found. The processed content associated with this interaction could not be found.';
          } else {
            this.interactionError = `Failed to load video content: ${error.message || 'Unknown error'}`;
          }
          this.isLoadingInteraction = false;
        },
      });
  }

  /**
   * Handle interaction completion with score
   */
  onInteractionCompleted(result: { score: number; selectedFragments: string[] }) {
    console.log('[LessonView] Interaction completed with score:', result.score);
    
    this.interactionScore = result.score;
    
    // Mark sub-stage as completed
    if (this.activeSubStageId) {
      this.lessonStages = this.lessonStages.map(stage => ({
        ...stage,
        subStages: stage.subStages.map(ss =>
          ss.id === this.activeSubStageId
            ? { ...ss, completed: true }
            : ss
        )
      }));
      
      this.updateActiveSubStage();
    }
    
    console.log('[LessonView] Score:', result.score, '% - Selected:', result.selectedFragments);
    
    // Play "after" script if available
    const afterScripts = (this.activeSubStage as any)?.scriptBlocksAfterInteraction;
    if (afterScripts && afterScripts.length > 0) {
      console.log('[LessonView] Playing post-interaction script');
      this.playTeacherScript(afterScripts[0], afterScripts[0]);
      
      // After scripts complete, check auto-progress
      const afterScriptDuration = afterScripts.reduce((sum: number, script: any) => sum + (script.estimatedDuration || 10), 0);
      setTimeout(() => {
        this.handleInteractionEnd();
      }, afterScriptDuration * 1000);
    } else {
      // No after scripts, check auto-progress immediately
      this.handleInteractionEnd();
    }
  }
  
  /**
   * Navigate to next substage or stage
   */
  moveToNextSubStage() {
    if (!this.activeStageId) return;
    
    const currentStage = this.lessonStages.find(s => s.id === this.activeStageId);
    if (!currentStage) return;
    
    const currentSubStageIndex = currentStage.subStages.findIndex(ss => ss.id === this.activeSubStageId);
    
    // Check if there's a next substage in current stage
    if (currentSubStageIndex < currentStage.subStages.length - 1) {
      const nextSubStage = currentStage.subStages[currentSubStageIndex + 1];
      console.log('[LessonView] Moving to next substage:', nextSubStage.title);
      this.selectSubStage(this.activeStageId, nextSubStage.id);
    } else {
      // Try to move to next stage
      const currentStageIndex = this.lessonStages.findIndex(s => s.id === this.activeStageId);
      if (currentStageIndex < this.lessonStages.length - 1) {
        const nextStage = this.lessonStages[currentStageIndex + 1];
        console.log('[LessonView] Moving to next stage:', nextStage.title);
        this.activeStageId = nextStage.id;
        this.expandedStages.add(nextStage.id);
        if (nextStage.subStages && nextStage.subStages.length > 0) {
          this.selectSubStage(nextStage.id, nextStage.subStages[0].id);
        }
      } else {
        // End of lesson
        console.log('[LessonView] 🎉 Lesson completed!');
        this.showEndOfLesson();
      }
    }
  }
  
  /**
   * Show end of lesson screen
   */
  showEndOfLesson() {
    // Defer to avoid change detection error
    setTimeout(() => {
      this.activeStageId = null;
      this.activeSubStageId = null;
      this.activeSubStage = null;
      this.currentTeacherScript = null;
      this.isScriptPlaying = false;
      this.cdr.detectChanges();
    }, 0);
    
    // Pause media player if active
    if (this.mediaPlayerRef && this.mediaPlayerRef.isPlaying()) {
      this.mediaPlayerRef.pause();
      console.log('[LessonView] ⏸ Media player paused at end of lesson');
    }
    
    console.log('[LessonView] Showing end of lesson screen');
  }
  
  /**
   * Restart the lesson from the beginning
   */
  restartLesson() {
    console.log('[LessonView] Restarting lesson');
    this.elapsedSeconds = 0; // Reset timer
    // Defer to avoid change detection error
    setTimeout(() => {
      this.isScriptPlaying = false;
      this.cdr.detectChanges();
    }, 0);
    
    // Pause and reset media player if active
    if (this.mediaPlayerRef) {
      if (this.mediaPlayerRef.isPlaying()) {
        this.mediaPlayerRef.pause();
      }
      // Seek to beginning if media is loaded
      try {
        this.mediaPlayerRef.seekTo(0);
      } catch (e) {
        // Media might not be loaded yet, ignore
      }
    }
    
    // Restart from first stage
    if (this.lessonStages.length > 0) {
      const firstStage = this.lessonStages[0];
      this.activeStageId = firstStage.id;
      this.expandedStages.clear();
      this.expandedStages.add(firstStage.id);
      
      if (firstStage.subStages && firstStage.subStages.length > 0) {
        this.selectSubStage(firstStage.id, firstStage.subStages[0].id);
      }
    }
  }

  /**
   * Media Player Event Handlers
   */
  onMediaLoaded(event: { duration: number; width?: number; height?: number }) {
    console.log('[LessonView] 🎬 Media loaded:', event);
    
    // Defer property updates to avoid ExpressionChangedAfterItHasBeenCheckedError
    // Use queueMicrotask to ensure this runs after the current change detection cycle
    queueMicrotask(() => {
      // Set media player reference for SDK now that media is loaded
      if (this.mediaPlayerRef) {
        this.interactionAISDK.setMediaPlayerRef(this.mediaPlayerRef);
        console.log('[LessonView] ✅ Media player reference set for SDK (onMediaLoaded)');
      }
      
      // Initialize volume from media player config if available
      if (this.mediaPlayerData?.config?.defaultVolume !== undefined) {
        this.mediaVolume = this.mediaPlayerData.config.defaultVolume;
        // Apply to media player
        if (this.mediaPlayerRef) {
          this.mediaPlayerRef.setVolume(this.mediaVolume);
        }
      }
      
      // Only attempt autoplay if the lesson is already playing (user has interacted)
      // This ensures we don't violate browser autoplay policies
      const shouldAutoplay = this.mediaPlayerData?.config?.autoplay ?? false;
      if (shouldAutoplay && this.mediaPlayerRef && this.isScriptPlaying) {
        // Lesson is already playing (user has clicked play), so we can attempt autoplay
        setTimeout(() => {
          if (this.mediaPlayerRef && !this.mediaPlayerRef.isPlaying()) {
            try {
              this.mediaPlayerRef.play();
              console.log('[LessonView] ▶️ Media started automatically (autoplay enabled, lesson playing)');
            } catch (error) {
              // Browser autoplay restrictions - this is expected and normal
              console.log('[LessonView] ℹ️ Autoplay blocked by browser (user interaction required):', error);
            }
          }
        }, 100);
      } else if (shouldAutoplay && !this.isScriptPlaying) {
        // Autoplay is enabled but lesson isn't playing yet
        // Media will start when user clicks play (handled in onTeacherPlay or selectSubStage)
        console.log('[LessonView] ℹ️ Media autoplay enabled - will start when lesson plays');
      }
      // Update ready flag in next microtask to avoid change detection issues
      queueMicrotask(() => {
        this.isMediaPlayerReady = !!(this.mediaPlayerRef && this.mediaPlayerData);
        this.cdr.markForCheck();
      });
    });
  }

  /**
   * Video URL Player Event Handlers
   * These mirror the media player handlers but operate on the video-url interaction
   */
  onVideoUrlLoaded(event: { duration: number; provider: string; videoId: string }) {
    console.log('[LessonView] 🎬 Video URL loaded:', event);
    
    // Set video URL ready flag
    queueMicrotask(() => {
      this.isVideoUrlReady = true;
      
      // Set video URL player reference for SDK
      if (this.videoUrlPlayerRef) {
        (window as any).__videoUrlPlayerRef = this.videoUrlPlayerRef;
        console.log('[LessonView] ✅ Video URL player reference set for SDK');
      }
      
      // Initialize volume from config if available
      if (this.videoUrlPlayerData?.config?.defaultVolume !== undefined) {
        this.mediaVolume = this.videoUrlPlayerData.config.defaultVolume;
        // Apply to video player
        if (this.videoUrlPlayerRef) {
          this.videoUrlPlayerRef.setVideoUrlVolume(this.mediaVolume);
        }
      }
      
      this.cdr.detectChanges();
    });
  }

  onVideoUrlTimeUpdate(currentTime: number) {
    // Sync lesson elapsed time with video current time for video-url interactions
    // Update elapsedSeconds when script is playing OR when timer is shown
    if (this.interactionBuild?.interactionTypeCategory === 'video-url' && (this.isScriptPlaying || this.showTimer)) {
      this.elapsedSeconds = Math.floor(currentTime);
      
      // Check if video has reached endTime - if so, pause and handle end
      const endTime = this.videoUrlPlayerData?.config?.endTime;
      if (endTime && currentTime >= endTime) {
        console.log('[LessonView] ⏹️ Video reached endTime:', endTime);
        // Pause the video
        if (this.videoUrlPlayerRef) {
          this.videoUrlPlayerRef.pauseVideoUrl();
        }
        // Handle interaction end (will check auto-progress flag)
        this.onVideoUrlEnded();
      }
    }
  }

  onVideoUrlPlay() {
    console.log('[LessonView] ▶️ Video URL playing');
    setTimeout(() => {
      if (!this.isScriptPlaying) {
        this.isScriptPlaying = true;
      }
      this.cdr.detectChanges();
    }, 0);
  }

  onVideoUrlPause() {
    console.log('[LessonView] ⏸ Video URL paused');
    setTimeout(() => {
      if (this.isScriptPlaying) {
        this.isScriptPlaying = false;
      }
      this.cdr.detectChanges();
    }, 0);
  }

  onVideoUrlEnded() {
    console.log('[LessonView] ✅ Video URL ended');
    // For now, just reuse the interaction end logic
    this.handleInteractionEnd();
  }

  onVideoUrlError(errorMessage: string) {
    console.error('[LessonView] ❌ Video URL error:', errorMessage);
    this.interactionError = errorMessage;
  }
  
  onVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newVolume = parseFloat(target.value);
    this.mediaVolume = newVolume;
    
    // Apply to media player if available
    if (this.mediaPlayerRef && this.isMediaPlayerReady) {
      this.mediaPlayerRef.setVolume(this.mediaVolume);
    }
    
    // Apply to video URL player if available
    if (this.videoUrlPlayerRef && this.isVideoUrlReady) {
      this.videoUrlPlayerRef.setVideoUrlVolume(this.mediaVolume);
    }
    
    // TODO: When TTS is integrated, also apply volume to TTS here
    // if (this.isTTSActive) {
    //   this.ttsService.setVolume(this.mediaVolume);
    // }
    
    console.log('[LessonView] 🔊 Volume changed to:', Math.round(this.mediaVolume * 100) + '%');
  }

  onMediaTimeUpdate(currentTime: number) {
    // Sync lesson elapsed time with media current time for uploaded-media interactions
    // This allows the lesson timer to reflect media playback progress
    if (this.interactionBuild?.interactionTypeCategory === 'uploaded-media' && this.isScriptPlaying) {
      // Update elapsed seconds to match media time (rounded to nearest second)
      this.elapsedSeconds = Math.floor(currentTime);
    }
  }

  onMediaPlay() {
    console.log('[LessonView] ▶️ Media playing');
    // Defer property updates to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      // Sync script play state with media
      if (!this.isScriptPlaying) {
        this.isScriptPlaying = true;
        // Start timer if needed
        if (this.timerInterval) {
          // Timer already running
        }
      }
      this.cdr.detectChanges();
    }, 0);
  }

  onMediaPause() {
    console.log('[LessonView] ⏸ Media paused');
    // Defer property updates to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      // Sync script pause state with media
      if (this.isScriptPlaying) {
        this.isScriptPlaying = false;
        // Timer will pause automatically (stops incrementing)
      }
      this.cdr.detectChanges();
    }, 0);
  }

  onMediaEnded() {
    console.log('[LessonView] ✅ Media ended');
    
    // Ensure video doesn't restart (prevent looping)
    if (this.mediaPlayerRef) {
      // Pause the video to prevent any restart
      this.mediaPlayerRef.pause();
      console.log('[LessonView] 🎬 Video paused after ending (preventing loop)');
    }
    
    // For media interactions, check if there's remaining time after video ends
    if (this.activeSubStage && this.interactionBuild?.interactionTypeCategory === 'uploaded-media') {
      const scriptBlocks = (this.activeSubStage as any)?.scriptBlocks || [];
      const totalAllocatedTime = this.calculateSubStageScriptDuration(); // Total time allocated for this sub-stage
      
      // Get video duration from media player
      const videoDuration = this.mediaPlayerRef?.getDuration() || 0;
      
      // If allocated time > video duration, wait for remaining time
      if (totalAllocatedTime > videoDuration) {
        const remainingTime = totalAllocatedTime - videoDuration;
        console.log(`[LessonView] Video ended, waiting ${remainingTime}s remaining time`);
        
        // Wait for remaining time, then check auto-progress
        setTimeout(() => {
          this.handleInteractionEnd();
        }, remainingTime * 1000);
      } else {
        // Video duration >= allocated time, check auto-progress immediately
        this.handleInteractionEnd();
      }
    } else {
      // Non-media interaction, check auto-progress immediately
      this.handleInteractionEnd();
    }
  }
  
  /**
   * Handle interaction end - check auto-progress flag and either advance or show Next button
   */
  private handleInteractionEnd() {
    if (!this.activeSubStage) {
      console.warn('[LessonView] No active sub-stage, cannot handle interaction end');
      return;
    }

    let shouldAutoProgress = true; // Default to true
    
    // For media interactions, check interaction config first
    if (this.interactionBuild?.interactionTypeCategory === 'uploaded-media') {
      const interaction = (this.activeSubStage as any)?.interaction;
      
      // Check interaction config for autoProgressAtEnd
      if (interaction?.config?.autoProgressAtEnd !== undefined) {
        shouldAutoProgress = interaction.config.autoProgressAtEnd;
        console.log('[LessonView] Found autoProgressAtEnd in interaction config:', shouldAutoProgress);
      } else {
        // Check loadInteractionTiming if available
        const loadInteractionTiming = (this.activeSubStage as any)?.loadInteractionTiming;
        if (loadInteractionTiming?.autoProgressAtEnd !== undefined) {
          shouldAutoProgress = loadInteractionTiming.autoProgressAtEnd;
          console.log('[LessonView] Found autoProgressAtEnd in loadInteractionTiming:', shouldAutoProgress);
        } else {
          // Check for load_interaction script block
          const scriptBlocks = (this.activeSubStage as any)?.scriptBlocks || [];
          const loadInteractionBlock = scriptBlocks.find((block: any) => block.type === 'load_interaction');
          if (loadInteractionBlock?.autoProgressAtEnd !== undefined) {
            shouldAutoProgress = loadInteractionBlock.autoProgressAtEnd;
            console.log('[LessonView] Found autoProgressAtEnd in load_interaction block:', shouldAutoProgress);
          } else {
            console.log('[LessonView] No autoProgressAtEnd found for media interaction, defaulting to true');
          }
        }
      }
    } else if (this.interactionBuild?.interactionTypeCategory === 'video-url') {
      // For video-url interactions, check interaction config first (same logic as uploaded-media)
      const interaction = (this.activeSubStage as any)?.interaction;
      
      // Check interaction config for autoProgressAtEnd
      if (interaction?.config?.autoProgressAtEnd !== undefined) {
        shouldAutoProgress = interaction.config.autoProgressAtEnd;
        console.log('[LessonView] Found autoProgressAtEnd in interaction config for video-url:', shouldAutoProgress);
      } else {
        // Check loadInteractionTiming if available
        const loadInteractionTiming = (this.activeSubStage as any)?.loadInteractionTiming;
        if (loadInteractionTiming?.autoProgressAtEnd !== undefined) {
          shouldAutoProgress = loadInteractionTiming.autoProgressAtEnd;
          console.log('[LessonView] Found autoProgressAtEnd in loadInteractionTiming for video-url:', shouldAutoProgress);
        } else {
          // Check for load_interaction script block
          const scriptBlocks = (this.activeSubStage as any)?.scriptBlocks || [];
          const loadInteractionBlock = scriptBlocks.find((block: any) => block.type === 'load_interaction');
          if (loadInteractionBlock?.autoProgressAtEnd !== undefined) {
            shouldAutoProgress = loadInteractionBlock.autoProgressAtEnd;
            console.log('[LessonView] Found autoProgressAtEnd in load_interaction block for video-url:', shouldAutoProgress);
          } else {
            console.log('[LessonView] No autoProgressAtEnd found for video-url interaction, defaulting to true');
          }
        }
      }
    } else {
      // For non-media interactions, check all script blocks
      const scriptBlocks = (this.activeSubStage as any)?.scriptBlocks || [];
      const afterScripts = (this.activeSubStage as any)?.scriptBlocksAfterInteraction || [];
      const allScripts = [...scriptBlocks, ...afterScripts];
      
      // Check if any script block has autoProgressAtEnd set to false
      // Default to true if not specified
      shouldAutoProgress = allScripts.every(script => script.autoProgressAtEnd !== false);
      console.log('[LessonView] Checked all script blocks for autoProgressAtEnd, result:', shouldAutoProgress);
    }
    
    console.log('[LessonView] handleInteractionEnd - shouldAutoProgress:', shouldAutoProgress);
    
    if (shouldAutoProgress) {
      // Auto-progress to next sub-stage
      console.log('[LessonView] Auto-progressing to next sub-stage');
      this.moveToNextSubStage();
    } else {
      // Show Next button and wait for user
      // Keep the lesson timer running and lesson-view on the sub-stage
      console.log('[LessonView] Auto-progress disabled - showing Next button');
      this.interactionEnded = true;
      
      // Ensure video stays paused and doesn't restart
      if (this.mediaPlayerRef && this.mediaPlayerRef.isPlaying()) {
        this.mediaPlayerRef.pause();
        console.log('[LessonView] 🎬 Paused video (auto-progress off)');
      }
      
      // Also pause video URL player if it's playing
      if (this.videoUrlPlayerRef && this.interactionBuild?.interactionTypeCategory === 'video-url') {
        this.videoUrlPlayerRef.pauseVideoUrl();
        console.log('[LessonView] 🎬 Paused video URL player (auto-progress disabled)');
      }
      
      // Don't pause the lesson timer - let it continue
      // The lesson-view will remain on this sub-stage until Next is clicked
      this.cdr.detectChanges();
      console.log('[LessonView] Interaction ended - waiting for user to click Next (lesson timer continues)');
    }
  }
  
  /**
   * Handle Next button click
   */
  onNextButtonClick() {
    console.log('[LessonView] Next button clicked');
    this.interactionEnded = false;
    this.moveToNextSubStage();
  }

  onMediaError(errorMessage: string) {
    console.error('[LessonView] ❌ Media error:', errorMessage);
    console.error('[LessonView] Media URL:', this.mediaPlayerData?.mediaUrl);
    console.error('[LessonView] Media Type:', this.mediaPlayerData?.mediaType);
    console.error('[LessonView] Media Config:', this.mediaPlayerData?.config);
    
    // Check if it's a network/CORS issue
    if (errorMessage.includes('Network') || errorMessage.includes('CORS')) {
      this.interactionError = `Media playback error: ${errorMessage}. Please check that the media file is accessible and CORS is properly configured.`;
    } else if (errorMessage.includes('Format') || errorMessage.includes('decode')) {
      this.interactionError = `Media playback error: ${errorMessage}. The media file may be corrupted, in an unsupported format, or the MIME type may be incorrect. Please check the file format and try re-uploading.`;
    } else {
      this.interactionError = `Media playback error: ${errorMessage}`;
    }
  }

  /**
   * Teacher Widget Handlers
   */
  onTeacherPlay() {
    console.log('[LessonView] ▶️ PLAY - Setting isScriptPlaying = true');
    console.log('[LessonView] Timer interval active:', !!this.timerInterval);
    console.log('[LessonView] Current elapsed:', this.elapsedSeconds);
    // Defer to avoid change detection error
    setTimeout(() => {
      this.isScriptPlaying = true;
      // Reset interactionEnded when playback starts
      this.interactionEnded = false;
      this.cdr.detectChanges();
    }, 0);
    
    // If media player is active, play it too
    if (this.mediaPlayerRef && this.interactionBuild?.interactionTypeCategory === 'uploaded-media') {
      // Wait a bit for media to be ready if needed
      setTimeout(() => {
        if (this.mediaPlayerRef && !this.mediaPlayerRef.isPlaying()) {
          try {
            this.mediaPlayerRef.play();
            console.log('[LessonView] ▶️ Media player started via script play');
          } catch (error) {
            console.warn('[LessonView] ⚠️ Could not play media (may not be ready yet):', error);
          }
        }
      }, 100);
    }
    
    // Timer will now increment (if visible)
    // TODO: Integrate TTS here when ready
    // Script stays visible until user closes or new script starts
  }

  onTeacherPause() {
    console.log('[LessonView] ⏸ PAUSE - Setting isScriptPlaying = false');
    // Defer to avoid change detection error
    setTimeout(() => {
      this.isScriptPlaying = false;
      this.cdr.detectChanges();
    }, 0);
    
    // If media player is active, pause it too
    if (this.mediaPlayerRef && this.interactionBuild?.interactionTypeCategory === 'uploaded-media') {
      if (this.mediaPlayerRef.isPlaying()) {
        this.mediaPlayerRef.pause();
        console.log('[LessonView] ⏸ Media player paused via script pause');
      }
    }
    
    // Timer will now pause (stops incrementing)
  }

  onTeacherSkip() {
    console.log('[LessonView] Teacher script skipped');
    // Defer to avoid change detection error
    setTimeout(() => {
      this.isScriptPlaying = false;
      this.currentTeacherScript = null;
      this.cdr.detectChanges();
    }, 0);
    
    // If media player is active, pause it when script is skipped
    if (this.mediaPlayerRef && this.interactionBuild?.interactionTypeCategory === 'uploaded-media') {
      if (this.mediaPlayerRef.isPlaying()) {
        this.mediaPlayerRef.pause();
        console.log('[LessonView] ⏸ Media player paused via script skip');
      }
    }
  }

  onScriptClosed() {
    console.log('[LessonView] ✖️ Script closed by user');
    this.currentTeacherScript = null;
    
    // If no interaction in this substage, skip to next stage immediately
    if (!this.getEmbeddedInteraction()) {
      console.log('[LessonView] No interaction - advancing immediately after script close');
      // Clear auto-advance timeout since we're manually advancing
      if (this.autoAdvanceTimeout) {
        clearTimeout(this.autoAdvanceTimeout);
        this.autoAdvanceTimeout = null;
      }
      this.moveToNextSubStage();
    }
  }

  onTeacherClosed() {
    console.log('[LessonView] Teacher widget minimized');
    this.teacherWidgetHidden = true;
    // Update last read count when widget is closed
    this.lastReadMessageCount = this.chatMessages.length;
  }

  /**
   * Bottom Control Bar Methods
   */
  toggleScriptPlay() {
    console.log('[LessonView] Toggle play/pause from control bar');
    if (this.isScriptPlaying) {
      this.onTeacherPause();
      
      // Also pause video URL player if active
      if (this.videoUrlPlayerRef && this.isVideoUrlReady) {
        this.videoUrlPlayerRef.pauseVideoUrl();
      }
    } else {
      this.onTeacherPlay();
      
      // Also play video URL player if ready
      if (this.videoUrlPlayerRef && this.isVideoUrlReady) {
        this.videoUrlPlayerRef.playVideoUrl();
      }
    }
  }

  skipScript() {
    console.log('[LessonView] Skip from control bar');
    this.onTeacherSkip();
  }

  /**
   * Chat Methods (delegated to widget)
   */
  sendChatMessage(message: string, screenshot?: string) {
    // Prevent sending empty messages (except for screenshot requests)
    if (!screenshot && (!message || message.trim() === '')) {
      console.warn('[LessonView] Cannot send empty message');
      return;
    }
    
    // Prevent duplicate sends (unless it's a screenshot or timeout fallback)
    if (this.isSendingMessage && !screenshot && !this.isTimeoutFallback) {
      console.warn('[LessonView] Message already sending, skipping duplicate');
      return;
    }
    
    console.log('[LessonView] Sending chat message:', message || '(screenshot only)');
    if (!this.isConnected) {
      console.warn('[LessonView] Cannot send - not connected to WebSocket');
      return;
    }
    
    // Mark as sending (only for non-screenshot, non-timeout messages)
    if (!screenshot && !this.isTimeoutFallback) {
      this.isSendingMessage = true;
      // Reset flag after a short delay to allow message to be sent
      setTimeout(() => {
        this.isSendingMessage = false;
      }, 1000);
    }
    
    // Clear any existing general response timeout
    if (this.generalResponseTimeout) {
      clearTimeout(this.generalResponseTimeout);
      this.generalResponseTimeout = null;
    }
    
    // Set 20-second timeout for general "no reply" fallback (only for non-screenshot messages)
    if (!screenshot) {
      this.generalResponseTimeout = setTimeout(() => {
        // Check if we've received a response
        const lastMessage = this.chatMessages[this.chatMessages.length - 1];
        const hasRecentResponse = lastMessage && 
          lastMessage.role === 'assistant' && 
          (new Date().getTime() - new Date(lastMessage.timestamp).getTime()) < 5000; // Response within last 5 seconds
        
        if (!hasRecentResponse && !this.isAITyping) {
          console.warn('[LessonView] No reply after 20 seconds - showing technical issues message');
          const errorMessage = {
            role: 'assistant' as const,
            content: '⚠️ We\'re experiencing technical issues connecting to the AI Teacher. Please try again in a moment.',
            timestamp: new Date(),
            isError: true,
          };
          // Add error message to chat via WebSocket service to ensure it's properly added
          const currentMessages = this.chatMessages;
          this.chatMessages = [...currentMessages, errorMessage];
          this.isAITyping = false;
        }
        this.generalResponseTimeout = null;
      }, 20000); // 20 seconds
    }
    
    // Get conversation history from chatMessages (exclude the current message we're about to send)
    const conversationHistory = this.chatMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
    
    // Get lesson data (full JSON structure)
    const lessonData = this.lesson ? this.lesson.data : null;
    
    // Get current stage and sub-stage information
    const currentStageInfo: any = {
      stageId: this.activeStageId,
      subStageId: this.activeSubStageId,
      stage: this.currentStage ? {
        id: this.currentStage.id,
        title: this.currentStage.title,
        type: this.currentStage.type
      } : null,
      subStage: this.activeSubStage ? {
        id: this.activeSubStage.id,
        title: this.activeSubStage.title,
        type: this.activeSubStage.type
      } : null
    };
    
    // If we're in a video-url interaction, include processed content data for AI context
    if (this.interactionBuild?.interactionTypeCategory === 'video-url' && this.videoUrlPlayerData?.processedContentData) {
      currentStageInfo.processedContentData = this.videoUrlPlayerData.processedContentData;
      console.log('[LessonView] 📹 Including video URL processed content data in AI context:', {
        hasMetadata: !!this.videoUrlPlayerData.processedContentData.metadata,
        hasTitle: !!this.videoUrlPlayerData.processedContentData.title,
        hasDescription: !!this.videoUrlPlayerData.processedContentData.description,
      });
    }
    
    // If screenshot is provided, this is a response to a screenshot request
    const isScreenshotRequest = !!screenshot;
    
    // If sending a screenshot, use empty message (screenshot is sent silently)
    // The backend will use the last user message from conversation history
    const messageToSend = isScreenshotRequest ? '' : message;
    
    this.wsService.sendMessage(messageToSend, conversationHistory, lessonData, screenshot, isScreenshotRequest, currentStageInfo, this.isTimeoutFallback);
    
    // Reset screenshot request state
    if (isScreenshotRequest) {
      this.screenshotRequested = false;
      this.pendingScreenshotMessage = '';
    }
  }

  /**
   * Capture screenshot of the lesson view area
   */
  async captureLessonScreenshot(): Promise<string | null> {
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Wait a bit for the page to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      // Find the main lesson content area - try multiple selectors
      let lessonContentElement: HTMLElement | null = null;
      
      // Try to find the lesson view wrapper or content area
      const selectors = [
        '.lesson-view-wrapper',
        '.lesson-content',
        '.main-content',
        'ion-content',
        '.lesson-view',
        'app-lesson-view',
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          lessonContentElement = element as HTMLElement;
          console.log(`[LessonView] 📸 Found element with selector: ${selector}`);
          break;
        }
      }
      
      // Fallback to body if nothing found
      if (!lessonContentElement) {
        console.warn('[LessonView] ⚠️ No specific content element found, using body');
        lessonContentElement = document.body;
      }

      if (!lessonContentElement) {
        console.error('[LessonView] ❌ Cannot capture screenshot - no element found');
        return null;
      }

      console.log('[LessonView] 📸 Capturing screenshot of element:', lessonContentElement.tagName, lessonContentElement.className);
      console.log('[LessonView] 📸 Element dimensions:', {
        width: lessonContentElement.offsetWidth,
        height: lessonContentElement.offsetHeight,
        scrollWidth: lessonContentElement.scrollWidth,
        scrollHeight: lessonContentElement.scrollHeight,
      });
      
      // Check if element has dimensions
      if (lessonContentElement.offsetWidth === 0 || lessonContentElement.offsetHeight === 0) {
        console.warn('[LessonView] ⚠️ Element has zero dimensions, trying body instead');
        lessonContentElement = document.body;
      }
      
      // Find and exclude the AI teacher chat UI from screenshot
      const chatWidget = document.querySelector('app-floating-teacher-widget');
      const teacherWidget = document.querySelector('.teacher-widget');
      
      const ignoreElements = (element: Element): boolean => {
        // Exclude the floating teacher widget (AI chat UI)
        if (chatWidget && (chatWidget.contains(element) || element === chatWidget)) {
          return true;
        }
        if (teacherWidget && (teacherWidget.contains(element) || element === teacherWidget)) {
          return true;
        }
        // Also check by class name as fallback
        if (element.classList?.contains('teacher-widget') || 
            element.classList?.contains('teacher-card') ||
            element.classList?.contains('chat-history') ||
            element.classList?.contains('chat-input-container')) {
          return true;
        }
        return false;
      };

      console.log('[LessonView] 📸 Excluding AI teacher chat UI from screenshot');
      if (chatWidget) {
        console.log('[LessonView] 📸 Found chat widget to exclude:', chatWidget);
      }
      if (teacherWidget) {
        console.log('[LessonView] 📸 Found teacher widget to exclude:', teacherWidget);
      }

      const canvas = await html2canvas(lessonContentElement, {
        backgroundColor: '#ffffff',
        logging: false, // Disable verbose logging
        useCORS: true,
        scale: 0.5, // Reduce size for faster processing
        allowTaint: false,
        width: lessonContentElement.scrollWidth || lessonContentElement.offsetWidth,
        height: lessonContentElement.scrollHeight || lessonContentElement.offsetHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        ignoreElements: ignoreElements, // Exclude AI chat UI
      });

      // Check if canvas is valid
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.error('[LessonView] ❌ Canvas is invalid (zero dimensions)');
        return null;
      }

      // Convert canvas to base64
      const base64Image = canvas.toDataURL('image/png', 0.8); // Use 0.8 quality
      console.log('[LessonView] ✅ Screenshot captured successfully:', base64Image.length, 'chars');
      console.log('[LessonView] 📸 Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('[LessonView] 📸 Screenshot preview (first 100 chars):', base64Image.substring(0, 100));
      
      // Check if data URL is valid (should start with "data:image/png;base64,")
      if (!base64Image.startsWith('data:image/png;base64,')) {
        console.error('[LessonView] ❌ Invalid data URL format:', base64Image.substring(0, 50));
        return null;
      }
      
      if (base64Image.length < 100) {
        console.error('[LessonView] ❌ Screenshot seems too small, might be invalid');
        return null;
      }
      
      return base64Image;
    } catch (error) {
      console.error('[LessonView] Failed to capture screenshot:', error);
      return null;
    }
  }

  /**
   * Handle screenshot request from AI - capture and send
   */
  async handleScreenshotRequest() {
    console.log('[LessonView] 📸 Handling screenshot request...');
    
    // Prevent infinite loops - check if we're already processing a screenshot
    if (this.screenshotRequested) {
      console.log('[LessonView] ⚠️ Screenshot request already in progress, skipping...');
      return;
    }
    
    this.screenshotRequested = true;
    
    // Show loading indicator
    this.isAITyping = true;
    
    try {
      console.log('[LessonView] 📸 Starting screenshot capture...');
      const screenshot = await this.captureLessonScreenshot();
      
      if (screenshot) {
        console.log('[LessonView] ✅ Screenshot captured successfully, length:', screenshot.length);
        
        // Store screenshot in service (replaces any previous screenshot - only 1 stored at a time)
        this.screenshotStorage.storeScreenshot(screenshot);
        
        // Send screenshot silently - use empty message or minimal message
        // The AI will respond based on the screenshot, and we'll show the camera emoji then
        console.log('[LessonView] 📤 Sending screenshot to backend...');
        this.sendChatMessage(
          '', // Empty message - screenshot is sent silently
          screenshot
        );
        console.log('[LessonView] ✅ Screenshot sent to backend');
      } else {
        // If screenshot capture failed, clear timeout and resend without screenshot
        console.warn('[LessonView] Screenshot capture failed - resending without screenshot');
        if (this.screenshotTimeout) {
          clearTimeout(this.screenshotTimeout);
          this.screenshotTimeout = null;
        }
        this.screenshotRequested = false;
        this.pendingScreenshotMessage = '';
        this.isAITyping = false;
        
        // Resend the original message without screenshot (only if fallback not already triggered)
        if (this.lastUserMessageBeforeScreenshot && !this.screenshotFallbackTriggered) {
          this.screenshotFallbackTriggered = true; // Mark as triggered to prevent duplicates
          this.sendChatMessage(this.lastUserMessageBeforeScreenshot);
          this.lastUserMessageBeforeScreenshot = '';
        }
      }
    } catch (error) {
      console.error('[LessonView] Error handling screenshot request:', error);
      // Clear timeout on error
      if (this.screenshotTimeout) {
        clearTimeout(this.screenshotTimeout);
        this.screenshotTimeout = null;
      }
      this.isAITyping = false;
      this.screenshotRequested = false;
      this.pendingScreenshotMessage = '';
      
      // Resend the original message without screenshot
      if (this.lastUserMessageBeforeScreenshot) {
        this.sendChatMessage(this.lastUserMessageBeforeScreenshot);
        this.lastUserMessageBeforeScreenshot = '';
      }
    }
  }

  raiseHand() {
    console.log('[LessonView] Raise hand clicked');
    this.wsService.sendMessage('🖐️ Student raised hand');
  }

  /**
   * Handle message added from widget (when SDK calls postToChat)
   */
  onWidgetMessageAdded(message: WidgetChatMessage) {
    // Convert widget's ChatMessage (optional timestamp) to websocket's ChatMessage (required timestamp)
    const chatMessage: ChatMessage = {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || new Date(),
      isError: message.isError
    };
    // Add message to parent's chatMessages array
    this.chatMessages = [...this.chatMessages, chatMessage];
    console.log('[LessonView] ✅ Message added from widget:', message.content.substring(0, 50));
    
    // Track unread messages (messages received while widget is minimized/closed)
    if (this.teacherWidgetHidden || (this.teacherWidget && this.teacherWidget.isMinimized)) {
      this.unreadMessageCount++;
      console.log('[LessonView] 📬 Unread messages:', this.unreadMessageCount);
    } else {
      // Widget is open, update last read count
      this.lastReadMessageCount = this.chatMessages.length;
    }
  }

  /**
   * Handle widget opened event (from widget's restore/openWidget methods)
   */
  onWidgetOpened() {
    // Reset unread count when widget is opened
    this.unreadMessageCount = 0;
    this.lastReadMessageCount = this.chatMessages.length;
    console.log('[LessonView] ✅ Widget opened - unread count reset');
  }

  /**
   * Toggle teacher widget visibility
   */
  toggleTeacherWidget() {
    this.teacherWidgetHidden = !this.teacherWidgetHidden;
    // Reset unread count when opening widget
    if (!this.teacherWidgetHidden) {
      this.unreadMessageCount = 0;
      this.lastReadMessageCount = this.chatMessages.length;
      // Ensure widget reference is set when widget becomes visible
      setTimeout(() => {
        if (this.teacherWidget) {
          this.interactionAISDK.setTeacherWidgetRef(this.teacherWidget);
          console.log('[LessonView] ✅ Teacher widget reference set on toggle');
        }
      }, 100);
      console.log('[LessonView] ✅ Widget opened - unread count reset');
    }
  }

  /**
   * FAB Click Handler
   */
  onFabClick(event: Event) {
    // If FAB was just dragged (moved), don't open widget
    if (this.fabDidMove) {
      console.log('[LessonView] FAB was dragged - not opening widget');
      this.fabDidMove = false;
      return;
    }
    
    // Otherwise, open widget
    this.toggleTeacherWidget();
  }

  /**
   * Start dragging FAB
   */
  startFabDrag(event: MouseEvent | TouchEvent) {
    if (!this.isFullscreen) {
      return; // Not in fullscreen, let click handler work
    }
    
    console.log('[LessonView] FAB mousedown - checking for drag');
    this.fabDragging = true;
    this.fabDidMove = false; // Reset move flag
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    // Initialize position from current location
    if (this.fabLeft === 0 && this.fabTop === 0) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.fabLeft = rect.left;
      this.fabTop = rect.top;
      console.log('[LessonView] FAB initial position:', this.fabLeft, this.fabTop);
    }
    
    this.fabDragStartX = clientX - this.fabLeft;
    this.fabDragStartY = clientY - this.fabTop;
    
    // Add global listeners
    document.addEventListener('mousemove', this.onFabDrag);
    document.addEventListener('mouseup', this.stopFabDrag);
    document.addEventListener('touchmove', this.onFabDrag);
    document.addEventListener('touchend', this.stopFabDrag);
  }

  private onFabDrag = (event: MouseEvent | TouchEvent) => {
    if (!this.fabDragging) return;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    const newLeft = clientX - this.fabDragStartX;
    const newTop = clientY - this.fabDragStartY;
    
    // Check if actually moved (more than 5px)
    const movedDistance = Math.abs(newLeft - this.fabLeft) + Math.abs(newTop - this.fabTop);
    if (movedDistance > 5) {
      this.fabDidMove = true;
    }
    
    this.fabLeft = newLeft;
    this.fabTop = newTop;
    
    // Keep within viewport
    const maxX = window.innerWidth - 70;
    const maxY = window.innerHeight - 70;
    
    this.fabLeft = Math.max(0, Math.min(this.fabLeft, maxX));
    this.fabTop = Math.max(0, Math.min(this.fabTop, maxY));
  }

  private stopFabDrag = () => {
    this.fabDragging = false;
    
    document.removeEventListener('mousemove', this.onFabDrag);
    document.removeEventListener('mouseup', this.stopFabDrag);
    document.removeEventListener('touchmove', this.onFabDrag);
    document.removeEventListener('touchend', this.stopFabDrag);
    
    // Reset fabDidMove after a short delay (so click handler can check it)
    setTimeout(() => {
      this.fabDidMove = false;
    }, 200);
  };

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    
    // Add/remove class to body to hide global header
    if (this.isFullscreen) {
      document.body.classList.add('fullscreen-active');
      // Initialize FAB position to bottom-right
      if (this.fabLeft === 0 && this.fabTop === 0) {
        this.fabLeft = window.innerWidth - 90; // 70px width + 20px margin
        this.fabTop = window.innerHeight - 90;
      }
    } else {
      document.body.classList.remove('fullscreen-active');
      // Reset FAB position
      this.fabLeft = 0;
      this.fabTop = 0;
    }
    
    console.log('[LessonView] 🖥️ Fullscreen toggled to:', this.isFullscreen);
  }

  /**
   * Lesson Timer Methods
   */
  toggleTimer() {
    console.log('[LessonView] ⏱️ TIMER DISPLAY TOGGLE - showTimer:', this.showTimer, '→', !this.showTimer);
    this.showTimer = !this.showTimer;
    // Timer button ONLY controls visibility, not timing
    // Timer always runs in background from lesson load
  }

  private startTimer() {
    console.log('[LessonView] Timer interval started');
    this.timerInterval = setInterval(() => {
      // Only increment when script is actively playing (pause button showing)
      if (this.isScriptPlaying) {
        this.elapsedSeconds++;
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      console.log('[LessonView] Timer stopped at', this.elapsedSeconds, 'seconds');
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Create blob URL for interaction build (PixiJS/HTML/iframe)
   */
  private createInteractionBlobUrl() {
    if (!this.interactionBuild) {
      this.interactionBlobUrl = null;
      return;
    }

    // Clean up old blob URL if it exists
    if (this.interactionBlobUrl) {
      const oldUrl = (this.interactionBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
    }

    // Get interaction config from sub-stage (lesson-builder configured values)
    const subStageConfig = (this.activeSubStage as any)?.interaction?.config || {};
    console.log('[LessonView] 🔍 subStageConfig:', subStageConfig);
    console.log('[LessonView] 🔍 subStageConfig.widgetConfigs:', subStageConfig.widgetConfigs);
    
    // Merge widget configs from build (interaction builder configured)
    // Widget configs can be in build.config.widgetConfigs or build.widgets.instances
    const widgetConfigs = this.interactionBuild.config?.widgetConfigs || {};
    const buildWidgets = this.interactionBuild.widgets?.instances || [];
    console.log('[LessonView] 🔍 buildWidgets:', buildWidgets);
    console.log('[LessonView] 🔍 widgetConfigs from build:', widgetConfigs);
    
    // Ensure existing widgetConfigs have instanceId
    Object.keys(widgetConfigs).forEach((instanceId) => {
      if (widgetConfigs[instanceId] && widgetConfigs[instanceId].config && !widgetConfigs[instanceId].config.instanceId) {
        widgetConfigs[instanceId].config.instanceId = instanceId;
      }
    });
    
    // Convert build.widgets.instances to widgetConfigs format if needed
    if (buildWidgets.length > 0) {
      buildWidgets.forEach((instance: any) => {
        if (instance.enabled) {
          console.log(`[LessonView] 📦 Adding widget config for ${instance.id} (${instance.type})`);
          // Ensure instanceId is included in config (required by widget SDK)
          const widgetConfig = instance.config || {};
          if (!widgetConfig.instanceId) {
            widgetConfig.instanceId = instance.id; // Add instanceId here
          }
          
          // Log hideControls value for timer widgets
          if (instance.type === 'timer') {
            console.log(`[LessonView] 🔍 Timer widget config from interaction builder:`, {
              instanceId: instance.id,
              hideControls: widgetConfig.hideControls,
              hasHideControls: widgetConfig.hasOwnProperty('hideControls'),
              allConfigKeys: Object.keys(widgetConfig)
            });
          }
          
          widgetConfigs[instance.id] = {
            type: instance.type,
            config: widgetConfig
          };
        }
      });
    }
    
    // CRITICAL: Merge lesson-specific widget configs (with imageIds) into widgetConfigs BEFORE creating final config
    // This ensures imageIds from lesson-builder are included
    console.log('[LessonView] 🔍 subStageConfig:', JSON.stringify(subStageConfig, null, 2));
    console.log('[LessonView] 🔍 subStageConfig.widgetConfigs:', JSON.stringify(subStageConfig.widgetConfigs, null, 2));
    console.log('[LessonView] 🔍 widgetConfigs BEFORE merge:', JSON.stringify(widgetConfigs, null, 2));
    
    // Get widget configs from subStageConfig - they might be directly in widgetConfigs or nested
    let lessonWidgetConfigs = subStageConfig.widgetConfigs || {};
    
    // IMPORTANT: If widgetConfigs is empty but we have enabled widgets, check if configs are stored elsewhere
    // Sometimes widget configs might be saved directly in the config object with widget instance IDs as keys
    if (Object.keys(lessonWidgetConfigs).length === 0 && buildWidgets.length > 0) {
      console.log('[LessonView] ⚠️ No widgetConfigs in subStageConfig, checking for widget configs in config object...');
      // Check if any enabled widget has a config stored directly in subStageConfig
      buildWidgets.forEach((widget: any) => {
        if (widget.enabled && subStageConfig[widget.id]) {
          console.log(`[LessonView] 🔍 Found widget config for ${widget.id} directly in subStageConfig`);
          if (!lessonWidgetConfigs[widget.id]) {
            lessonWidgetConfigs[widget.id] = {
              type: widget.type,
              config: subStageConfig[widget.id]
            };
          }
        }
      });
    }
    
    console.log('[LessonView] 🔍 MERGING lesson widget configs:', JSON.stringify(lessonWidgetConfigs, null, 2));
    
    if (Object.keys(lessonWidgetConfigs).length > 0) {
      Object.keys(lessonWidgetConfigs).forEach((lessonKey) => {
        const lessonConfig = lessonWidgetConfigs[lessonKey];
        console.log(`[LessonView] 🔍 Processing lesson config for key "${lessonKey}":`, {
          type: lessonConfig.type,
          hasConfig: !!lessonConfig.config,
          imageIds: lessonConfig.config?.imageIds
        });
        
        // Try to find matching widget by:
        // 1. Exact instanceId match
        // 2. Widget type match (find first enabled widget of that type)
        // 3. Partial key match (e.g., "image-carousel" matches "image-carousel-1768605625260")
        let targetInstanceId: string | null = null;
        
        // First, try exact match
        if (widgetConfigs[lessonKey]) {
          targetInstanceId = lessonKey;
          console.log(`[LessonView] ✅ Found exact match for key "${lessonKey}"`);
        } else {
          // Try to find by widget type
          const widgetType = lessonConfig.type || lessonKey;
          
          // Try to find in buildWidgets first
          const matchingWidget = buildWidgets.find((w: any) => w.type === widgetType && w.enabled);
          if (matchingWidget && widgetConfigs[matchingWidget.id]) {
            targetInstanceId = matchingWidget.id;
            console.log(`[LessonView] ✅ Found type match in buildWidgets: "${widgetType}" -> instanceId "${targetInstanceId}"`);
          } else {
            // Try to find in widgetConfigs by type
            const configEntry = Object.entries(widgetConfigs).find(([id, config]: [string, any]) => 
              config.type === widgetType
            );
            if (configEntry) {
              targetInstanceId = configEntry[0];
              console.log(`[LessonView] ✅ Found type match in widgetConfigs: "${widgetType}" -> instanceId "${targetInstanceId}"`);
            } else {
              // Last resort: try partial key match (e.g., "image-carousel" matches "image-carousel-*")
              const partialMatch = Object.keys(widgetConfigs).find(id => id.startsWith(lessonKey) || lessonKey.startsWith(id.split('-').slice(0, 2).join('-')));
              if (partialMatch) {
                targetInstanceId = partialMatch;
                console.log(`[LessonView] ✅ Found partial key match: "${lessonKey}" -> instanceId "${targetInstanceId}"`);
              }
            }
          }
        }
        
        if (targetInstanceId && widgetConfigs[targetInstanceId]) {
          // Merge lesson config into existing widget config
          // Preserve interaction builder settings (like hideControls) unless lesson config explicitly overrides them
          const interactionBuilderConfig = widgetConfigs[targetInstanceId].config || {};
          const lessonSpecificConfig = lessonConfig.config || {};
          
          console.log(`[LessonView] 🔍 Merging config for ${targetInstanceId}:`, {
            interactionBuilder: {
              hideControls: interactionBuilderConfig.hideControls,
              hasHideControls: interactionBuilderConfig.hasOwnProperty('hideControls')
            },
            lessonConfig: {
              hideControls: lessonSpecificConfig.hideControls,
              hasHideControls: lessonSpecificConfig.hasOwnProperty('hideControls'),
              allKeys: Object.keys(lessonSpecificConfig)
            }
          });
          
          // Merge configs: lesson config overrides interaction builder config
          // BUT: preserve interaction builder's hideControls if lesson config doesn't explicitly set it
          const mergedConfig = {
            ...interactionBuilderConfig,
            ...lessonSpecificConfig
          };
          
          // Special handling for hideControls: only override if lesson config explicitly sets it
          // This ensures interaction builder settings are preserved unless lesson builder overrides
          if (!lessonSpecificConfig.hasOwnProperty('hideControls') && interactionBuilderConfig.hasOwnProperty('hideControls')) {
            mergedConfig.hideControls = interactionBuilderConfig.hideControls;
            console.log(`[LessonView] 🔒 Preserving hideControls from interaction builder: ${interactionBuilderConfig.hideControls}`);
          }
          
          widgetConfigs[targetInstanceId].config = mergedConfig;
          
          console.log(`[LessonView] ✅ MERGED config for ${targetInstanceId}:`, {
            imageIds: widgetConfigs[targetInstanceId].config.imageIds,
            hideControls: widgetConfigs[targetInstanceId].config.hideControls,
            finalHideControls: mergedConfig.hideControls
          });
        } else {
          console.log(`[LessonView] ⚠️ No matching widget found for lesson key "${lessonKey}" (type: ${lessonConfig.type || 'unknown'})`);
        }
      });
    } else {
      console.log('[LessonView] ⚠️ No lesson widget configs to merge');
    }
    
    // Remove disabled widgets
    Object.keys(widgetConfigs).forEach((instanceId) => {
      const widgetExists = buildWidgets.some((w: any) => w.id === instanceId && w.enabled);
      if (!widgetExists) {
        console.log(`[LessonView] 🗑️ Removing disabled widget: ${instanceId}`);
        delete widgetConfigs[instanceId];
      }
    });
    
    // Log widgetConfigs after merge
    console.log('[LessonView] 🔍 widgetConfigs AFTER merge:', JSON.stringify(widgetConfigs, null, 2));
    
    // Merge sub-stage config with widget configs (but exclude widgetConfigs from subStageConfig to avoid duplication)
    const { widgetConfigs: _, ...subStageConfigWithoutWidgets } = subStageConfig;
    const config = {
      ...subStageConfigWithoutWidgets,
      widgetConfigs: widgetConfigs
    };
    
    // Log final config to verify imageIds are present
    console.log('[LessonView] 🔍 Final config.widgetConfigs:', JSON.stringify(config.widgetConfigs, null, 2));
    
    console.log('[LessonView] 🔍 Final config widgetConfigs keys:', Object.keys(config.widgetConfigs));
    Object.keys(config.widgetConfigs).forEach((instanceId) => {
      console.log(`[LessonView] 🔍 Final widget config ${instanceId}:`, {
        type: config.widgetConfigs[instanceId].type,
        imageIds: config.widgetConfigs[instanceId].config?.imageIds
      });
    });
    
    
    const sampleData = this.interactionBuild.sampleData || {};
    
    // Log overlayMode before creating HTML (for debugging)
    if (this.interactionBuild.interactionTypeCategory === 'iframe') {
      console.log('[LessonView] 🎛️ createInteractionBlobUrl - overlayMode:', this.interactionBuild.iframeConfig?.overlayMode, 'Full iframeConfig:', JSON.stringify(this.interactionBuild.iframeConfig, null, 2));
    }

    // Create HTML document
    const htmlDoc = this.createInteractionHtmlDoc(this.interactionBuild, config, sampleData);
    
    // Create blob URL with cache busting
    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.interactionBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    // Force iframe recreation by incrementing preview key
    this.interactionPreviewKey++;
    
    console.log('[LessonView] ✅ Created blob URL for interaction:', this.interactionBuild.id, 'Preview key:', this.interactionPreviewKey);
    
    // If overlayMode is 'section', inject the JavaScript separately after a delay
    // This ensures the section element is rendered in the DOM before we inject the script
    if (this.interactionBuild.interactionTypeCategory === 'iframe' && 
        this.getIframeOverlayMode() === 'section' && 
        this.interactionBuild.jsCode) {
      // Use queueMicrotask + setTimeout to ensure Angular has finished rendering
      queueMicrotask(() => {
        setTimeout(() => {
          this.injectIframeSectionScript(this.interactionBuild.jsCode);
        }, 300); // Longer delay to ensure section is fully rendered
      });
    }
  }

  /**
   * Create iframe wrapper HTML with customizable overlay for iframe interactions
   */
  private createIframeWrapperWithOverlay(
    iframeUrl: string, 
    configJson: string, 
    sampleDataJson: string, 
    htmlCode: string, 
    cssCode: string, 
    jsCode: string,
    isSDKTest: boolean = false
  ): string {
    // Full wrapper HTML with buttons overlaid on top of iframe
    // Normalize line endings first (handle \r\n and \r)
    const normalizedHtml = htmlCode ? htmlCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
    const normalizedCss = cssCode ? cssCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
    const normalizedJs = jsCode ? jsCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
    
    // Escape code for template literal injection (escape backticks, ${}, and backslashes, but keep newlines)
    const escapedHtml = normalizedHtml ? normalizedHtml.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${') : '';
    const escapedCss = normalizedCss ? normalizedCss.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${') : '';
    const escapedJs = normalizedJs ? normalizedJs.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${') : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Teacher SDK Test - iFrame Wrapper</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      background: #0f0f23;
      color: #ffffff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
      position: relative;
      width: 100vw;
      height: 100vh;
    }
    
    #iframe-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    
    #iframe-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    #button-overlay {
      position: absolute;
      top: 0;
      right: 0;
      width: 320px;
      max-height: 100vh;
      background: rgba(15, 15, 35, 0.95);
      border-left: 2px solid rgba(0, 212, 255, 0.3);
      z-index: 10;
      overflow-y: auto;
      padding: 20px;
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.5);
      display: block !important;
      transform: translateX(0) !important;
    }
    
    #toggle-overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 50px;
      height: 50px;
      background: rgba(0, 212, 255, 0.2);
      border: 2px solid rgba(0, 212, 255, 0.5);
      border-radius: 50%;
      color: #00d4ff;
      font-size: 24px;
      cursor: pointer;
      z-index: 11;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    
    #toggle-overlay:hover {
      background: rgba(0, 212, 255, 0.3);
      border-color: #00d4ff;
      transform: scale(1.1);
    }
    
    #button-overlay.hidden {
      transform: translateX(100%);
      display: none;
    }
    
    /* Ensure button overlay is visible by default */
    #button-overlay {
      display: block !important;
    }
    
    #sdk-test-header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid rgba(0, 212, 255, 0.3);
    }
    
    #sdk-test-header h1 {
      color: #00d4ff;
      margin: 0 0 10px 0;
      font-size: 20px;
    }
    
    #status-text {
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
      font-size: 12px;
    }
    
    .section-label {
      color: #00d4ff;
      font-size: 14px;
      font-weight: bold;
      margin: 20px 0 10px 0;
      padding-top: 15px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .test-button {
      display: block;
      width: 100%;
      padding: 10px 15px;
      margin: 6px 0;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 4px;
      color: #00d4ff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    
    .test-button:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      transform: translateX(3px);
    }
    
    .test-button:active {
      transform: translateX(1px);
    }
    
    #button-overlay::-webkit-scrollbar {
      width: 6px;
    }
    
    #button-overlay::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    
    #button-overlay::-webkit-scrollbar-thumb {
      background: rgba(0, 212, 255, 0.3);
      border-radius: 3px;
    }
    
    #button-overlay::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 212, 255, 0.5);
    }
  </style>
</head>
<body>
  <div id="iframe-container">
    <iframe id="external-iframe" src="${this.escapeHtml(iframeUrl)}" frameborder="0" allowfullscreen></iframe>
  </div>
  
  <button id="toggle-overlay" title="Toggle Overlay Panel">⚙</button>
  
  <div id="button-overlay">
    <div id="overlay-content">
      <!-- SDK Test structure (always at the top) -->
      <div id="sdk-test-header">
        <h1>SDK Test iFrame</h1>
        <p id="status-text">Initializing...</p>
      </div>
      <div id="sdk-test-buttons"></div>
      <!-- Builder's HTML content (below SDK test structure) -->
      ${escapedHtml || ''}
    </div>
  </div>

  <script type="text/javascript">
    // Inject interaction data and config
    window.interactionData = ${sampleDataJson};
    window.interactionConfig = ${configJson};
    
    // Ensure SDK test elements are visible and at the top
    // Elements are already in the HTML template at the top
    (function() {
      const header = document.getElementById("sdk-test-header");
      const buttons = document.getElementById("sdk-test-buttons");
      const status = document.getElementById("status-text");
      
      // Ensure elements are visible and positioned at the top
      const overlayContent = document.getElementById("overlay-content");
      if (overlayContent) {
        if (header) {
          header.style.display = "block";
          // Move to top if not already there
          if (header.parentNode === overlayContent && header !== overlayContent.firstElementChild) {
            overlayContent.insertBefore(header, overlayContent.firstChild);
          }
        }
        if (buttons) {
          buttons.style.display = "block";
          // Move to top after header if not already there
          if (buttons.parentNode === overlayContent) {
            const headerEl = document.getElementById("sdk-test-header");
            if (headerEl && buttons !== headerEl.nextElementSibling) {
              overlayContent.insertBefore(buttons, headerEl.nextSibling || overlayContent.firstChild);
            } else if (!headerEl && buttons !== overlayContent.firstElementChild) {
              overlayContent.insertBefore(buttons, overlayContent.firstChild);
            }
          }
        }
      }
      if (status) status.style.display = "block";
    })();
    
    // Provide createIframeAISDK helper function for builder's code
    // Only declare if it doesn't already exist (builder's code might provide it)
    if (typeof window.createIframeAISDK === 'undefined') {
      window.createIframeAISDK = () => {
      let subscriptionId = null;
      let requestCounter = 0;

      const generateRequestId = () => \`req-\${Date.now()}-\${++requestCounter}\`;
      const generateSubscriptionId = () => \`sub-\${Date.now()}-\${Math.random()}\`;

      const sendMessage = (type, data, callback) => {
        const requestId = generateRequestId();
        const message = { type, requestId, ...data };

        if (callback) {
          const listener = (event) => {
            if (event.data.requestId === requestId) {
              window.removeEventListener("message", listener);
              callback(event.data);
            }
          };
          window.addEventListener("message", listener);
        }

        window.parent.postMessage(message, "*");
      };

      return {
        emitEvent: (event, processedContentId) => {
          sendMessage("ai-sdk-emit-event", { event, processedContentId });
        },
        updateState: (key, value) => {
          sendMessage("ai-sdk-update-state", { key, value });
        },
        getState: (callback) => {
          sendMessage("ai-sdk-get-state", {}, (response) => {
            callback(response.state);
          });
        },
        onResponse: (callback) => {
          subscriptionId = generateSubscriptionId();
          sendMessage("ai-sdk-subscribe", { subscriptionId }, () => {
            const listener = (event) => {
              if (event.data.type === "ai-sdk-response" && event.data.subscriptionId === subscriptionId) {
                callback(event.data.response);
              }
            };
            window.addEventListener("message", listener);
            return () => {
              window.removeEventListener("message", listener);
              sendMessage("ai-sdk-unsubscribe", { subscriptionId });
            };
          });
        },
        isReady: (callback) => {
          const listener = (event) => {
            if (event.data.type === "ai-sdk-ready") {
              window.removeEventListener("message", listener);
              callback(true);
            }
          };
          window.addEventListener("message", listener);
        },
        minimizeChatUI: () => {
          sendMessage("ai-sdk-minimize-chat-ui", {});
        },
        showChatUI: () => {
          sendMessage("ai-sdk-show-chat-ui", {});
        },
        activateFullscreen: () => {
          sendMessage("ai-sdk-activate-fullscreen", {});
        },
        deactivateFullscreen: () => {
          sendMessage("ai-sdk-deactivate-fullscreen", {});
        },
        postToChat: (content, role, showInWidget) => {
          sendMessage("ai-sdk-post-to-chat", { content, role, showInWidget });
        },
        showScript: (script, autoPlay) => {
          sendMessage("ai-sdk-show-script", { script, autoPlay });
        },
        showSnack: (content, duration, hideFromChatUI, callback) => {
          sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false }, (response) => {
            if (callback && response.snackId) {
              callback(response.snackId);
            }
          });
        },
        hideSnack: () => {
          sendMessage("ai-sdk-hide-snack", {});
        },
        saveInstanceData: (data, callback) => {
          sendMessage("ai-sdk-save-instance-data", { data }, (response) => {
            if (callback) {
              callback(response.success, response.error);
            }
          });
        },
        getInstanceDataHistory: (filters, callback) => {
          sendMessage("ai-sdk-get-instance-data-history", { filters }, (response) => {
            if (callback) {
              callback(response.data, response.error);
            }
          });
        },
        saveUserProgress: (data, callback) => {
          sendMessage("ai-sdk-save-user-progress", { data }, (response) => {
            if (callback) {
              callback(response.progress, response.error);
            }
          });
        },
        getUserProgress: (callback) => {
          sendMessage("ai-sdk-get-user-progress", {}, (response) => {
            if (callback) {
              callback(response.progress, response.error);
            }
          });
        },
        markCompleted: (callback) => {
          sendMessage("ai-sdk-mark-completed", {}, (response) => {
            if (callback) {
              callback(response.progress, response.error);
            }
          });
        },
        incrementAttempts: (callback) => {
          sendMessage("ai-sdk-increment-attempts", {}, (response) => {
            if (callback) {
              callback(response.progress, response.error);
            }
          });
        },
        getUserPublicProfile: (userId, callback) => {
          sendMessage("ai-sdk-get-user-public-profile", { userId }, (response) => {
            if (callback) {
              callback(response.profile, response.error);
            }
          });
        },
        // Media Control Methods
        playMedia: (callback) => {
          sendMessage("ai-sdk-play-media", {}, (response) => {
            if (callback) {
              callback(response.success, response.error);
            }
          });
        },
        pauseMedia: () => {
          sendMessage("ai-sdk-pause-media", {});
        },
        seekMedia: (time) => {
          sendMessage("ai-sdk-seek-media", { time });
        },
        setMediaVolume: (volume) => {
          sendMessage("ai-sdk-set-media-volume", { volume });
        },
        getMediaCurrentTime: (callback) => {
          sendMessage("ai-sdk-get-media-current-time", {}, (response) => {
            if (callback) {
              callback(response.currentTime);
            }
          });
        },
        getMediaDuration: (callback) => {
          sendMessage("ai-sdk-get-media-duration", {}, (response) => {
            if (callback) {
              callback(response.duration);
            }
          });
        },
        isMediaPlaying: (callback) => {
          sendMessage("ai-sdk-is-media-playing", {}, (response) => {
            if (callback) {
              callback(response.isPlaying);
            }
          });
        },
        showOverlayHtml: () => {
          sendMessage("ai-sdk-show-overlay-html", {});
        },
        hideOverlayHtml: () => {
          sendMessage("ai-sdk-hide-overlay-html", {});
        },
        // HTML/PixiJS Layering Utilities
        // Store input-button pairs for dynamic repositioning on resize
        _inputButtonPairs: [],
        positionInputBesideButton: function(inputElement, buttonContainer, offsetX = 0, offsetY = 0, buttonWidth = 150) {
          if (!inputElement || !buttonContainer) return;
          // Get button position in screen coordinates
          const buttonScreenX = buttonContainer.x + (buttonContainer.buttonX || 0);
          const buttonScreenY = buttonContainer.y + (buttonContainer.buttonY || 0);
          // Position input to the right of button (button width + spacing)
          const inputX = buttonScreenX + buttonWidth + 10 + offsetX;
          const inputY = buttonScreenY + offsetY;
          inputElement.style.position = "absolute";
          inputElement.style.left = inputX + "px";
          inputElement.style.top = inputY + "px";
          inputElement.style.zIndex = "1000"; // Ensure it's above PixiJS canvas
          
          // Store the pair for resize handling
          this._inputButtonPairs.push({
            input: inputElement,
            button: buttonContainer,
            offsetX: offsetX,
            offsetY: offsetY,
            buttonWidth: buttonWidth
          });
        },
        repositionAllInputs: function() {
          this._inputButtonPairs.forEach(pair => {
            if (pair.input && pair.button) {
              const buttonScreenX = pair.button.x + (pair.button.buttonX || 0);
              const buttonScreenY = pair.button.y + (pair.button.buttonY || 0);
              const inputX = buttonScreenX + pair.buttonWidth + 10 + pair.offsetX;
              const inputY = buttonScreenY + pair.offsetY;
              pair.input.style.left = inputX + "px";
              pair.input.style.top = inputY + "px";
            }
          });
        },
        // HTML/PixiJS Coordinate Transformation System
        _attachedHtmlElements: [],
        convertPixiToScreen: function(pixiX, pixiY, pixiContainer) {
          if (!pixiContainer) {
            console.warn('[SDK] convertPixiToScreen: pixiContainer is required');
            return { x: pixiX, y: pixiY };
          }
          
          // Get the global position of the container
          const globalPos = pixiContainer.getGlobalPosition();
          const screenX = globalPos.x;
          const screenY = globalPos.y;
          
          // Account for container's local position
          return {
            x: screenX + pixiX,
            y: screenY + pixiY
          };
        },
        convertScreenToPixi: function(screenX, screenY, pixiContainer) {
          if (!pixiContainer) {
            console.warn('[SDK] convertScreenToPixi: pixiContainer is required');
            return { x: screenX, y: screenY };
          }
          
          // Get the global position of the container
          const globalPos = pixiContainer.getGlobalPosition();
          
          // Convert screen coordinates to local container coordinates
          return {
            x: screenX - globalPos.x,
            y: screenY - globalPos.y
          };
        },
        getViewTransform: function(pixiContainer) {
          if (!pixiContainer) {
            return { scale: { x: 1, y: 1 }, x: 0, y: 0, rotation: 0 };
          }
          
          return {
            scale: { x: pixiContainer.scale.x, y: pixiContainer.scale.y },
            x: pixiContainer.x,
            y: pixiContainer.y,
            rotation: pixiContainer.rotation,
            pivot: { x: pixiContainer.pivot.x, y: pixiContainer.pivot.y }
          };
        },
        attachHtmlToPixiElement: function(htmlElement, pixiContainer, options = {}) {
          if (!htmlElement || !pixiContainer) {
            console.warn('[SDK] attachHtmlToPixiElement: htmlElement and pixiContainer are required');
            return;
          }
          
          const {
            offsetX = 0,
            offsetY = 0,
            anchor = 'center',
            updateOnTransform = true,
            zIndex = 1000
          } = options;
          
          // Set initial z-index
          htmlElement.style.zIndex = zIndex;
          htmlElement.style.position = 'absolute';
          
          // Calculate anchor offset
          let anchorOffsetX = 0;
          let anchorOffsetY = 0;
          
          if (pixiContainer.width && pixiContainer.height) {
            const width = pixiContainer.width;
            const height = pixiContainer.height;
            
            switch (anchor) {
              case 'top-left':
                anchorOffsetX = 0;
                anchorOffsetY = 0;
                break;
              case 'top-right':
                anchorOffsetX = width;
                anchorOffsetY = 0;
                break;
              case 'bottom-left':
                anchorOffsetX = 0;
                anchorOffsetY = height;
                break;
              case 'bottom-right':
                anchorOffsetX = width;
                anchorOffsetY = height;
                break;
              case 'top':
                anchorOffsetX = width / 2;
                anchorOffsetY = 0;
                break;
              case 'bottom':
                anchorOffsetX = width / 2;
                anchorOffsetY = height;
                break;
              case 'left':
                anchorOffsetX = 0;
                anchorOffsetY = height / 2;
                break;
              case 'right':
                anchorOffsetX = width;
                anchorOffsetY = height / 2;
                break;
              case 'center':
              default:
                anchorOffsetX = width / 2;
                anchorOffsetY = height / 2;
                break;
            }
          }
          
          // Store attachment info
          const attachment = {
            htmlElement: htmlElement,
            pixiContainer: pixiContainer,
            offsetX: offsetX,
            offsetY: offsetY,
            anchorOffsetX: anchorOffsetX,
            anchorOffsetY: anchorOffsetY,
            updateOnTransform: updateOnTransform,
            zIndex: zIndex
          };
          
          this._attachedHtmlElements.push(attachment);
          
          // Initial positioning
          this._updateHtmlElementPosition(attachment);
          
          return attachment;
        },
        _updateHtmlElementPosition: function(attachment) {
          if (!attachment || !attachment.htmlElement || !attachment.pixiContainer) return;
          
          const screenPos = this.convertPixiToScreen(
            attachment.anchorOffsetX + attachment.offsetX,
            attachment.anchorOffsetY + attachment.offsetY,
            attachment.pixiContainer
          );
          
          attachment.htmlElement.style.left = screenPos.x + 'px';
          attachment.htmlElement.style.top = screenPos.y + 'px';
        },
        updateAllAttachedHtml: function() {
          this._attachedHtmlElements.forEach(attachment => {
            if (attachment.updateOnTransform) {
              this._updateHtmlElementPosition(attachment);
            }
          });
        },
        detachHtmlFromPixiElement: function(htmlElement) {
          const index = this._attachedHtmlElements.findIndex(att => att.htmlElement === htmlElement);
          if (index !== -1) {
            this._attachedHtmlElements.splice(index, 1);
            return true;
          }
          return false;
        },
        attachInputToImageArea: function(inputElement, imageSprite, options = {}) {
          if (!inputElement || !imageSprite) {
            console.warn('[SDK] attachInputToImageArea: inputElement and imageSprite are required');
            return;
          }
          
          const {
            imageX = 0,
            imageY = 0,
            offsetX = 0,
            offsetY = -30,
            anchor = 'center',
            updateOnZoom = true,
            updateOnPan = true
          } = options;
          
          // Create a temporary container at the image coordinates
          const tempContainer = new PIXI.Container();
          tempContainer.x = imageX;
          tempContainer.y = imageY;
          
          // Add temp container to image sprite's parent at image's position
          if (imageSprite.parent) {
            imageSprite.parent.addChild(tempContainer);
            // Position relative to image sprite
            tempContainer.x = imageSprite.x + imageX;
            tempContainer.y = imageSprite.y + imageY;
          } else {
            console.warn('[SDK] attachInputToImageArea: imageSprite must be added to stage first');
            return;
          }
          
          // Use the standard attachHtmlToPixiElement with the temp container
          return this.attachHtmlToPixiElement(inputElement, tempContainer, {
            offsetX: offsetX,
            offsetY: offsetY,
            anchor: anchor,
            updateOnTransform: updateOnZoom || updateOnPan
          });
        },
        _zoomPanInstances: new Map(),
        setupZoomPan: function(pixiContainer, options = {}) {
          if (!pixiContainer) {
            console.warn('[SDK] setupZoomPan: pixiContainer is required');
            return null;
          }
          
          const {
            minZoom = 0.5,
            maxZoom = 3.0,
            initialZoom = 1.0,
            enablePinchZoom = true,
            enableWheelZoom = true,
            enableDrag = true,
            showZoomControls = true,
            zoomControlPosition = 'top-right',
            onZoomChange = null,
            onPanChange = null
          } = options;
          
          const instanceId = 'zoomPan_' + Date.now() + '_' + Math.random();
          const self = this;
          let currentZoom = initialZoom;
          let isDragging = false;
          let dragStart = { x: 0, y: 0 };
          let lastPan = { x: pixiContainer.x || 0, y: pixiContainer.y || 0 };
          let lastPinchDistance = 0;
          let touchStartPositions = [];
          
          // Initialize container
          pixiContainer.scale.set(initialZoom);
          pixiContainer.pivot.set(0, 0);
          
          // Create zoom controls UI if requested
          let zoomControlsContainer = null;
          if (showZoomControls) {
            zoomControlsContainer = document.createElement('div');
            zoomControlsContainer.id = 'zoom-controls-' + instanceId;
            zoomControlsContainer.style.position = 'absolute';
            zoomControlsContainer.style.zIndex = '1001';
            zoomControlsContainer.style.padding = '10px';
            zoomControlsContainer.style.background = 'rgba(15, 15, 35, 0.9)';
            zoomControlsContainer.style.borderRadius = '4px';
            zoomControlsContainer.style.border = '2px solid #00d4ff';
            
            // Position controls
            if (zoomControlPosition.includes('top')) {
              zoomControlsContainer.style.top = '20px';
            } else {
              zoomControlsContainer.style.bottom = '20px';
            }
            if (zoomControlPosition.includes('right')) {
              zoomControlsContainer.style.right = '20px';
            } else {
              zoomControlsContainer.style.left = '20px';
            }
            
            // Zoom in button
            const zoomInBtn = document.createElement('button');
            zoomInBtn.textContent = '+';
            zoomInBtn.style.cssText = 'width: 30px; height: 30px; margin: 2px; background: #00d4ff; border: none; border-radius: 4px; color: #0f0f23; cursor: pointer; font-size: 18px;';
            zoomInBtn.onclick = () => setZoom(currentZoom * 1.2);
            
            // Zoom out button
            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.textContent = '−';
            zoomOutBtn.style.cssText = 'width: 30px; height: 30px; margin: 2px; background: #00d4ff; border: none; border-radius: 4px; color: #0f0f23; cursor: pointer; font-size: 18px;';
            zoomOutBtn.onclick = () => setZoom(currentZoom / 1.2);
            
            // Reset button
            const resetBtn = document.createElement('button');
            resetBtn.textContent = '⌂';
            resetBtn.style.cssText = 'width: 30px; height: 30px; margin: 2px; background: #00d4ff; border: none; border-radius: 4px; color: #0f0f23; cursor: pointer; font-size: 14px;';
            resetBtn.onclick = resetView;
            
            zoomControlsContainer.appendChild(zoomInBtn);
            zoomControlsContainer.appendChild(zoomOutBtn);
            zoomControlsContainer.appendChild(resetBtn);
            document.body.appendChild(zoomControlsContainer);
          }
          
          // Set zoom level
          function setZoom(zoom, centerX = null, centerY = null) {
            const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
            
            if (centerX === null || centerY === null) {
              centerX = pixiContainer.width / 2;
              centerY = pixiContainer.height / 2;
            }
            
            // Get current world position of center point
            const worldPos = self.convertPixiToScreen(centerX, centerY, pixiContainer);
            
            // Update zoom
            currentZoom = newZoom;
            pixiContainer.scale.set(currentZoom);
            
            // Adjust position to keep center point in same screen position
            const newWorldPos = self.convertPixiToScreen(centerX, centerY, pixiContainer);
            pixiContainer.x += worldPos.x - newWorldPos.x;
            pixiContainer.y += worldPos.y - newWorldPos.y;
            
            lastPan = { x: pixiContainer.x, y: pixiContainer.y };
            
            // Update attached HTML elements
            self.updateAllAttachedHtml();
            
            if (onZoomChange) onZoomChange(currentZoom);
          }
          
          // Set pan position
          function setPan(x, y) {
            pixiContainer.x = x;
            pixiContainer.y = y;
            lastPan = { x: x, y: y };
            
            // Update attached HTML elements
            self.updateAllAttachedHtml();
            
            if (onPanChange) onPanChange(x, y);
          }
          
          // Reset view
          function resetView() {
            currentZoom = initialZoom;
            pixiContainer.scale.set(initialZoom);
            pixiContainer.x = 0;
            pixiContainer.y = 0;
            lastPan = { x: 0, y: 0 };
            
            // Update attached HTML elements
            self.updateAllAttachedHtml();
            
            if (onZoomChange) onZoomChange(currentZoom);
            if (onPanChange) onPanChange(0, 0);
          }
          
          // Mouse wheel zoom
          if (enableWheelZoom) {
            const canvas = pixiContainer.parent?.canvas || document;
            const wheelHandler = (e) => {
              e.preventDefault();
              const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
              const centerX = e.clientX - rect.left;
              const centerY = e.clientY - rect.top;
              const delta = e.deltaY > 0 ? 0.9 : 1.1;
              setZoom(currentZoom * delta, centerX, centerY);
            };
            
            if (canvas.addEventListener) {
              canvas.addEventListener('wheel', wheelHandler, { passive: false });
            }
          }
          
          // Mouse drag to pan
          if (enableDrag) {
            const canvas = pixiContainer.parent?.canvas || document;
            let mouseDown = false;
            let mouseStart = { x: 0, y: 0 };
            
            const mouseDownHandler = (e) => {
              mouseDown = true;
              mouseStart = { x: e.clientX, y: e.clientY };
              canvas.style.cursor = 'grabbing';
            };
            
            const mouseMoveHandler = (e) => {
              if (!mouseDown) return;
              const dx = e.clientX - mouseStart.x;
              const dy = e.clientY - mouseStart.y;
              setPan(lastPan.x + dx, lastPan.y + dy);
              mouseStart = { x: e.clientX, y: e.clientY };
            };
            
            const mouseUpHandler = () => {
              mouseDown = false;
              canvas.style.cursor = 'grab';
            };
            
            if (canvas.addEventListener) {
              canvas.addEventListener('mousedown', mouseDownHandler);
              canvas.addEventListener('mousemove', mouseMoveHandler);
              canvas.addEventListener('mouseup', mouseUpHandler);
              canvas.addEventListener('mouseleave', mouseUpHandler);
              canvas.style.cursor = 'grab';
            }
          }
          
          // Touch pinch zoom and pan
          if (enablePinchZoom) {
            const canvas = pixiContainer.parent?.canvas || document;
            
            const touchStartHandler = (e) => {
              touchStartPositions = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
              if (e.touches.length === 1) {
                isDragging = true;
                dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }
            };
            
            const touchMoveHandler = (e) => {
              e.preventDefault();
              
              if (e.touches.length === 2) {
                // Pinch zoom
                isDragging = false;
                const touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                const touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
                const distance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
                
                if (lastPinchDistance > 0) {
                  const scale = distance / lastPinchDistance;
                  const centerX = (touch1.x + touch2.x) / 2;
                  const centerY = (touch1.y + touch2.y) / 2;
                  setZoom(currentZoom * scale, centerX, centerY);
                }
                
                lastPinchDistance = distance;
              } else if (e.touches.length === 1 && isDragging) {
                // Single touch pan
                const dx = e.touches[0].clientX - dragStart.x;
                const dy = e.touches[0].clientY - dragStart.y;
                setPan(lastPan.x + dx, lastPan.y + dy);
                dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }
            };
            
            const touchEndHandler = (e) => {
              if (e.touches.length === 0) {
                isDragging = false;
                lastPinchDistance = 0;
                touchStartPositions = [];
              } else if (e.touches.length === 1) {
                lastPinchDistance = 0;
              }
            };
            
            if (canvas.addEventListener) {
              canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
              canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
              canvas.addEventListener('touchend', touchEndHandler);
              canvas.addEventListener('touchcancel', touchEndHandler);
            }
          }
          
          const instance = {
            id: instanceId,
            setZoom: setZoom,
            setPan: setPan,
            resetView: resetView,
            getZoom: () => currentZoom,
            getPan: () => ({ x: pixiContainer.x, y: pixiContainer.y }),
            destroy: () => {
              if (zoomControlsContainer) {
                zoomControlsContainer.remove();
              }
              self._zoomPanInstances.delete(instanceId);
            }
          };
          
          this._zoomPanInstances.set(instanceId, instance);
          return instance;
        },
        _hotspotInstances: new Map(),
        createHotspot: function(imageSprite, options = {}) {
          if (!imageSprite) {
            console.warn('[SDK] createHotspot: imageSprite is required');
            return null;
          }
          
          const {
            x = 0,
            y = 0,
            radius = 20,
            shape = 'circle',
            width = null,
            height = null,
            points = null,
            visible = false,
            color = 0x00ff00,
            alpha = 0.3,
            cursor = 'pointer',
            id = 'hotspot_' + Date.now() + '_' + Math.random(),
            onHover = null,
            onLeave = null,
            onClick = null
          } = options;
          
          // Create hotspot container
          const hotspotContainer = new PIXI.Container();
          hotspotContainer.x = x;
          hotspotContainer.y = y;
          hotspotContainer.eventMode = 'static';
          hotspotContainer.cursor = cursor;
          
          // Create visual indicator if visible
          let indicator = null;
          if (visible) {
            indicator = new PIXI.Graphics();
            
            if (shape === 'circle') {
              indicator.beginFill(color, alpha);
              indicator.drawCircle(0, 0, radius);
              indicator.endFill();
              hotspotContainer.hitArea = new PIXI.Circle(0, 0, radius);
            } else if (shape === 'rect') {
              const w = width || radius * 2;
              const h = height || radius * 2;
              indicator.beginFill(color, alpha);
              indicator.drawRect(-w/2, -h/2, w, h);
              indicator.endFill();
              hotspotContainer.hitArea = new PIXI.Rectangle(-w/2, -h/2, w, h);
            } else if (shape === 'polygon' && points) {
              indicator.beginFill(color, alpha);
              indicator.drawPolygon(points.map(p => new PIXI.Point(p.x, p.y)));
              indicator.endFill();
              hotspotContainer.hitArea = new PIXI.Polygon(points.map(p => new PIXI.Point(p.x, p.y)));
            }
            
            if (indicator) {
              hotspotContainer.addChild(indicator);
            }
          } else {
            // Invisible hotspot still needs hit area
            if (shape === 'circle') {
              hotspotContainer.hitArea = new PIXI.Circle(0, 0, radius);
            } else if (shape === 'rect') {
              const w = width || radius * 2;
              const h = height || radius * 2;
              hotspotContainer.hitArea = new PIXI.Rectangle(-w/2, -h/2, w, h);
            } else if (shape === 'polygon' && points) {
              hotspotContainer.hitArea = new PIXI.Polygon(points.map(p => new PIXI.Point(p.x, p.y)));
            }
          }
          
          // Add event handlers
          if (onHover) {
            hotspotContainer.on('pointerenter', () => onHover(hotspot));
          }
          
          if (onLeave) {
            hotspotContainer.on('pointerleave', () => onLeave(hotspot));
          }
          
          if (onClick) {
            hotspotContainer.on('pointerdown', (event) => {
              onClick(hotspot, event);
            });
          }
          
          // Add to image sprite's parent (or create parent container)
          if (imageSprite.parent) {
            imageSprite.parent.addChild(hotspotContainer);
          } else {
            console.warn('[SDK] createHotspot: imageSprite must be added to stage first');
          }
          
          const hotspot = {
            id: id,
            container: hotspotContainer,
            indicator: indicator,
            imageSprite: imageSprite,
            x: x,
            y: y,
            radius: radius,
            shape: shape,
            visible: visible,
            setVisible: (visible) => {
              if (indicator) {
                indicator.visible = visible;
              }
              hotspot.visible = visible;
            },
            setPosition: (newX, newY) => {
              hotspotContainer.x = newX;
              hotspotContainer.y = newY;
              hotspot.x = newX;
              hotspot.y = newY;
            },
            destroy: () => {
              if (hotspotContainer.parent) {
                hotspotContainer.parent.removeChild(hotspotContainer);
              }
              hotspotContainer.destroy({ children: true });
              this._hotspotInstances.delete(id);
            }
          };
          
          this._hotspotInstances.set(id, hotspot);
          return hotspot;
        },
        createHotspots: function(imageSprite, hotspotConfigs) {
          if (!Array.isArray(hotspotConfigs)) {
            console.warn('[SDK] createHotspots: hotspotConfigs must be an array');
            return [];
          }
          
          return hotspotConfigs.map(config => this.createHotspot(imageSprite, config));
        },
        // Image methods
        getLessonImages: function(lessonId, accountId, imageId, callback) {
          sendMessage("ai-sdk-get-lesson-images", { lessonId, accountId, imageId }, (response) => {
            if (callback) {
              callback(response.images || [], response.error);
            }
          });
        },
        getLessonImageIds: function(lessonId, accountId, callback) {
          sendMessage("ai-sdk-get-lesson-image-ids", { lessonId, accountId }, (response) => {
            if (callback) {
              callback(response.imageIds || [], response.error);
            }
          });
        },
        deleteImage: function(imageId, callback) {
          sendMessage("ai-sdk-delete-image", { imageId }, (response) => {
            if (callback) {
              callback(response.success, response.error);
            }
          });
        },
        // Widget initialization methods
        initImageCarousel: function(config) {
          if (!config || !config.instanceId) {
            console.warn('[SDK] initImageCarousel: config with instanceId is required');
            return;
          }
          
          const widgetId = 'widget-' + config.instanceId;
          let widgetContainer = document.getElementById(widgetId);
          
          // Create widget container if it doesn't exist (should be created by injected HTML)
          if (!widgetContainer) {
            // Find widget marker in HTML or create container
            const marker = document.querySelector('[data-widget-id="' + config.instanceId + '"]') || 
                          document.querySelector('div[id*="' + config.instanceId + '"]');
            if (marker) {
              widgetContainer = marker;
            } else {
              // Create container at bottom of body
              widgetContainer = document.createElement('div');
              widgetContainer.id = widgetId;
              widgetContainer.setAttribute('data-widget-id', config.instanceId);
              widgetContainer.setAttribute('data-widget-type', 'image-carousel');
              document.body.appendChild(widgetContainer);
            }
          }
          
          // Create collapsible section structure if not already present
          let collapsibleSection = widgetContainer.querySelector('.widget-collapsible-section');
          if (!collapsibleSection) {
            collapsibleSection = document.createElement('div');
            collapsibleSection.className = 'widget-collapsible-section';
            collapsibleSection.innerHTML = '<div class="widget-collapsible-header" style="cursor: pointer; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 10px;"><span class="widget-collapsible-icon" style="transition: transform 0.3s;">▼</span><span class="widget-collapsible-title">Image Carousel</span></div><div class="widget-collapsible-content" style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 0 0 8px 8px; max-height: 500px; overflow-y: auto;"><div class="carousel-container" style="position: relative; width: 100%; max-width: 800px; margin: 0 auto;"><div class="carousel-images" style="position: relative; width: 100%; min-height: 400px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); border-radius: 8px;"></div><button class="carousel-prev" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: none; color: white; padding: 10px 15px; border-radius: 50%; cursor: pointer; font-size: 20px;">‹</button><button class="carousel-next" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: none; color: white; padding: 10px 15px; border-radius: 50%; cursor: pointer; font-size: 20px;">›</button><div class="carousel-controls" style="text-align: center; margin-top: 10px;"><button class="carousel-get-images" style="background: #ff3b3f; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Get Lesson Images</button><div class="carousel-image-list" style="margin-top: 10px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-size: 12px;"></div></div></div></div>';
            widgetContainer.appendChild(collapsibleSection);
            
            // Toggle collapse/expand
            const header = collapsibleSection.querySelector('.widget-collapsible-header');
            const content = collapsibleSection.querySelector('.widget-collapsible-content');
            const icon = collapsibleSection.querySelector('.widget-collapsible-icon');
            let isExpanded = true;
            
            header.addEventListener('click', () => {
              isExpanded = !isExpanded;
              content.style.display = isExpanded ? 'block' : 'none';
              icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
            });
            
            // Carousel navigation
            let currentImageIndex = 0;
            const imagesContainer = collapsibleSection.querySelector('.carousel-images');
            const prevBtn = collapsibleSection.querySelector('.carousel-prev');
            const nextBtn = collapsibleSection.querySelector('.carousel-next');
            const getImagesBtn = collapsibleSection.querySelector('.carousel-get-images');
            const imageList = collapsibleSection.querySelector('.carousel-image-list');
            let carouselImages = [];
            
            function renderCurrentImage() {
              if (carouselImages.length === 0) {
                imagesContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No images loaded</p>';
                return;
              }
              const img = carouselImages[currentImageIndex];
              imagesContainer.innerHTML = \`<img src="\${img.url}" style="max-width: 100%; max-height: 400px; border-radius: 8px;" />\`;
              prevBtn.style.display = carouselImages.length > 1 ? 'block' : 'none';
              nextBtn.style.display = carouselImages.length > 1 ? 'block' : 'none';
            }
            
            prevBtn.addEventListener('click', () => {
              if (carouselImages.length > 0) {
                currentImageIndex = (currentImageIndex - 1 + carouselImages.length) % carouselImages.length;
                renderCurrentImage();
              }
            });
            
            nextBtn.addEventListener('click', () => {
              if (carouselImages.length > 0) {
                currentImageIndex = (currentImageIndex + 1) % carouselImages.length;
                renderCurrentImage();
              }
            });
            
            // Get lesson images
            if (getImagesBtn && window.aiSDK && window.aiSDK.getLessonImages) {
              getImagesBtn.addEventListener('click', () => {
                window.aiSDK.getLessonImages((images) => {
                  if (images && images.length > 0) {
                    carouselImages = images;
                    currentImageIndex = 0;
                    renderCurrentImage();
                    imageList.innerHTML = \`<strong>Image IDs:</strong><br>\${images.map((img, idx) => \`\${idx + 1}. \${img.id || 'No ID'}\`).join('<br>')}\`;
                  } else {
                    imageList.innerHTML = '<span style="color: rgba(255,255,255,0.5);">No images found</span>';
                  }
                });
              });
            }
            
            renderCurrentImage();
          }
          
          console.log('[SDK] Image Carousel widget initialized:', config.instanceId);
        },
        initTimer: function(config) {
          if (!config || !config.instanceId) {
            console.warn('[SDK] initTimer: config with instanceId is required');
            return;
          }
          
          const widgetId = 'widget-' + config.instanceId;
          let widgetContainer = document.getElementById(widgetId);
          
          // Create widget container if it doesn't exist
          if (!widgetContainer) {
            const marker = document.querySelector('[data-widget-id="' + config.instanceId + '"]') || 
                          document.querySelector('div[id*="' + config.instanceId + '"]');
            if (marker) {
              widgetContainer = marker;
            } else {
              widgetContainer = document.createElement('div');
              widgetContainer.id = widgetId;
              widgetContainer.setAttribute('data-widget-id', config.instanceId);
              widgetContainer.setAttribute('data-widget-type', 'timer');
              document.body.appendChild(widgetContainer);
            }
          }
          
          // Create collapsible section structure
          let collapsibleSection = widgetContainer.querySelector('.widget-collapsible-section');
          if (!collapsibleSection) {
            collapsibleSection = document.createElement('div');
            collapsibleSection.className = 'widget-collapsible-section';
            collapsibleSection.innerHTML = '<div class="widget-collapsible-header" style="cursor: pointer; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 10px;"><span class="widget-collapsible-icon" style="transition: transform 0.3s;">▼</span><span class="widget-collapsible-title">Timer</span></div><div class="widget-collapsible-content" style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 0 0 8px 8px;"><div class="timer-display" style="text-align: center; font-size: 48px; font-weight: bold; color: #ff3b3f; margin: 20px 0;">00:00</div><div class="timer-controls" style="display: flex; gap: 10px; justify-content: center;"><button class="timer-start" style="background: #00d4ff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Start</button><button class="timer-pause" style="background: #ff3b3f; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Pause</button><button class="timer-reset" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Reset</button></div></div>';
            widgetContainer.appendChild(collapsibleSection);
            
            // Toggle collapse/expand
            const header = collapsibleSection.querySelector('.widget-collapsible-header');
            const content = collapsibleSection.querySelector('.widget-collapsible-content');
            const icon = collapsibleSection.querySelector('.widget-collapsible-icon');
            let isExpanded = true;
            
            header.addEventListener('click', () => {
              isExpanded = !isExpanded;
              content.style.display = isExpanded ? 'block' : 'none';
              icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
            });
            
            // Timer logic
            let seconds = 0;
            let intervalId = null;
            const display = collapsibleSection.querySelector('.timer-display');
            const startBtn = collapsibleSection.querySelector('.timer-start');
            const pauseBtn = collapsibleSection.querySelector('.timer-pause');
            const resetBtn = collapsibleSection.querySelector('.timer-reset');
            
            function formatTime(secs) {
              const mins = Math.floor(secs / 60);
              const secsRemainder = secs % 60;
              return \`\${String(mins).padStart(2, '0')}:\${String(secsRemainder).padStart(2, '0')}\`;
            }
            
            function updateDisplay() {
              display.textContent = formatTime(seconds);
            }
            
            startBtn.addEventListener('click', () => {
              if (!intervalId) {
                intervalId = setInterval(() => {
                  seconds++;
                  updateDisplay();
                }, 1000);
              }
            });
            
            pauseBtn.addEventListener('click', () => {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
            });
            
            resetBtn.addEventListener('click', () => {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
              seconds = 0;
              updateDisplay();
            });
            
            // Auto-start if configured
            if (config.startOnLoad) {
              setTimeout(() => {
                if (startBtn) startBtn.click();
              }, 100);
            }
            
            // Hide controls if configured
            if (config.hideControls) {
              const controls = collapsibleSection.querySelector('.timer-controls');
              if (controls) controls.style.display = 'none';
            }
            
            updateDisplay();
          }
          
          console.log('[SDK] Timer widget initialized:', config.instanceId);
        },
        completeInteraction: function() {
          sendMessage("ai-sdk-complete-interaction", {});
        },
        initImageCarousel: function(config = {}) {
          console.log('[Widget] 🖼️ Initializing Image Carousel widget with config:', config);
          const widgetId = config.instanceId || 'image-carousel';
          const container = document.getElementById('widget-' + widgetId);
          if (!container) {
            console.error('[Widget] ❌ Image Carousel container not found: widget-' + widgetId);
            return;
          }
          const imageIds = config.imageIds || [];
          if (!Array.isArray(imageIds) || imageIds.length === 0) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'widget-error';
            errorMsg.style.cssText = 'padding: 20px; text-align: center; background: rgba(255, 0, 0, 0.1); border: 2px solid #ff3b3f; border-radius: 8px; color: #ff3b3f; margin: 10px 0;';
            errorMsg.innerHTML = '<p style="margin: 0; font-weight: bold;">⚠️ Image Carousel Not Configured</p><p style="margin: 10px 0 0 0; font-size: 0.9em;">No image IDs have been added. Please configure the carousel in the Interaction Builder.</p>';
            container.appendChild(errorMsg);
            console.error('[Widget] ❌ Image Carousel: No image IDs configured. Add image IDs in the widget configuration.');
            return;
          }
          console.log('[Widget] ✅ Image Carousel initialized with ' + imageIds.length + ' image(s)');
        },
        initTimer: function(config = {}) {
          console.log('[Widget] ⏱️ Initializing Timer widget with config:', config);
          const widgetId = config.instanceId || 'timer';
          const container = document.getElementById('widget-' + widgetId);
          if (!container) {
            console.error('[Widget] ❌ Timer container not found: widget-' + widgetId);
            return;
          }
          const duration = config.duration || config.timeLimit || 0;
          if (!duration || duration <= 0) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'widget-error';
            errorMsg.style.cssText = 'padding: 20px; text-align: center; background: rgba(255, 0, 0, 0.1); border: 2px solid #ff3b3f; border-radius: 8px; color: #ff3b3f; margin: 10px 0;';
            errorMsg.innerHTML = '<p style="margin: 0; font-weight: bold;">⚠️ Timer Not Configured</p><p style="margin: 10px 0 0 0; font-size: 0.9em;">No time limit has been set. Please configure the timer duration in the Interaction Builder.</p>';
            container.appendChild(errorMsg);
            console.error('[Widget] ❌ Timer: No duration configured. Set a time limit in the widget configuration.');
            return;
          }
          console.log('[Widget] ✅ Timer initialized with duration: ' + duration + ' seconds');
        },
        initWidget: function(widgetId, config = {}) {
          console.log('[Widget] 🔧 Initializing widget: ' + widgetId + ' with config:', config);
          if (widgetId === 'image-carousel') {
            this.initImageCarousel(config);
          } else if (widgetId === 'timer') {
            this.initTimer(config);
          } else {
            console.warn('[Widget] ⚠️ Unknown widget type: ' + widgetId);
          }
        },
      };
      
      // Set up resize listeners for layering utilities
      window.addEventListener("resize", () => {
        if (window.createIframeAISDK && typeof window.createIframeAISDK === 'function') {
          // This will be called when SDK is created, but we need to track instances
          // For now, builders should call repositionAllInputs in their resize handlers
        }
      });
    };
    } // End of createIframeAISDK declaration check
    
    ${escapedJs ? `// Custom overlay code from builder
    (function() {
      console.log("[SDK Test iFrame] Starting initialization...");
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTestApp);
      } else {
        setTimeout(initTestApp, 10);
      }
    })();

    const createIframeAISDK = () => {
      let subscriptionId = null;
      let requestCounter = 0;

      const generateRequestId = () => \`req-\${Date.now()}-\${++requestCounter}\`;
      const generateSubscriptionId = () => \`sub-\${Date.now()}-\${Math.random()}\`;

      const sendMessage = (type, data, callback) => {
        const requestId = generateRequestId();
        const message = { type, requestId, ...data };

        if (callback) {
          const listener = (event) => {
            if (event.data.requestId === requestId) {
              window.removeEventListener("message", listener);
              callback(event.data);
            }
          };
          window.addEventListener("message", listener);
        }

        window.parent.postMessage(message, "*");
      };

      return {
        emitEvent: (event, processedContentId) => {
          sendMessage("ai-sdk-emit-event", { event, processedContentId });
        },
        updateState: (key, value) => {
          sendMessage("ai-sdk-update-state", { key, value });
        },
        getState: (callback) => {
          sendMessage("ai-sdk-get-state", {}, (response) => {
            callback(response.state);
          });
        },
        onResponse: (callback) => {
          subscriptionId = generateSubscriptionId();
          sendMessage("ai-sdk-subscribe", { subscriptionId }, () => {
            const listener = (event) => {
              if (event.data.type === "ai-sdk-response" && event.data.subscriptionId === subscriptionId) {
                callback(event.data.response);
              }
            };
            window.addEventListener("message", listener);
            return () => {
              window.removeEventListener("message", listener);
              sendMessage("ai-sdk-unsubscribe", { subscriptionId });
            };
          });
        },
        isReady: (callback) => {
          const listener = (event) => {
            if (event.data.type === "ai-sdk-ready") {
              window.removeEventListener("message", listener);
              callback(true);
            }
          };
          window.addEventListener("message", listener);
        },
        minimizeChatUI: () => {
          sendMessage("ai-sdk-minimize-chat-ui", {});
        },
        showChatUI: () => {
          sendMessage("ai-sdk-show-chat-ui", {});
        },
        activateFullscreen: () => {
          sendMessage("ai-sdk-activate-fullscreen", {});
        },
        deactivateFullscreen: () => {
          sendMessage("ai-sdk-deactivate-fullscreen", {});
        },
        postToChat: (content, role, showInWidget) => {
          sendMessage("ai-sdk-post-to-chat", { content, role, showInWidget });
        },
        showScript: (script, autoPlay) => {
          sendMessage("ai-sdk-show-script", { script, autoPlay });
        },
        showSnack: (content, duration, hideFromChatUI, callback) => {
          sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false }, (response) => {
            if (callback && response.snackId) {
              callback(response.snackId);
            }
          });
        },
        hideSnack: () => {
          sendMessage("ai-sdk-hide-snack", {});
        },
        saveInstanceData: (data, callback) => {
          sendMessage("ai-sdk-save-instance-data", { data }, (response) => {
            if (callback) {
              callback(response.success, response.error);
            }
          });
        },
        getInstanceDataHistory: (filters, callback) => {
          sendMessage("ai-sdk-get-instance-data-history", { filters }, (response) => {
            if (callback) {
              callback(response.data, response.error);
            }
          });
        },
        saveUserProgress: (data, callback) => {
          sendMessage("ai-sdk-save-user-progress", { data }, (response) => {
            if (callback) {
              callback(response.progress, response.error);
            }
          });
        },
        getUserProgress: (callback) => {
          sendMessage("ai-sdk-get-user-progress", {}, (response) => {
            if (callback) {
              callback(response.progress, response.error);
            }
          });
        },
        markCompleted: (callback) => {
          sendMessage("ai-sdk-mark-completed", {}, (response) => {
            if (callback) {
              callback(response.progress, response.error);
            }
          });
        },
        incrementAttempts: (callback) => {
          sendMessage("ai-sdk-increment-attempts", {}, (response) => {
            if (callback) {
              callback(response.progress, response.error);
            }
          });
        },
        getUserPublicProfile: (userId, callback) => {
          sendMessage("ai-sdk-get-user-public-profile", { userId }, (response) => {
            if (callback) {
              callback(response.profile, response.error);
            }
          });
        },
      };
    };

    let aiSDK = null;
    let statusText = null;
    let buttonsContainer = null;
    let externalIframe = null;
    let buttonOverlay = null;
    let toggleButton = null;

    function updateStatus(message, color = "#ffffff") {
      if (statusText) {
        statusText.textContent = message;
        statusText.style.color = color;
      }
      console.log("[SDK Test iFrame]", message);
    }

    function createButton(text, onClick) {
      const button = document.createElement("button");
      button.className = "test-button";
      button.textContent = text;
      button.onclick = onClick;
      if (buttonsContainer) {
        buttonsContainer.appendChild(button);
      }
      return button;
    }

    function initTestApp() {
      console.log("[SDK Test iFrame] Initializing app...");
      
      buttonsContainer = document.getElementById("sdk-test-buttons");
      statusText = document.getElementById("status-text");
      externalIframe = document.getElementById("external-iframe");
      buttonOverlay = document.getElementById("button-overlay");
      toggleButton = document.getElementById("toggle-overlay");
      
      if (!buttonsContainer || !externalIframe || !buttonOverlay || !toggleButton) {
        console.error("[SDK Test iFrame] Required elements not found!");
        return;
      }

      const iframeUrl = (window.interactionConfig && window.interactionConfig.iframeUrl) || 
                        (window.interactionData && window.interactionData.url) ||
                        'https://en.wikipedia.org/wiki/Main_Page';
      
      externalIframe.src = iframeUrl;
      console.log("[SDK Test iFrame] Loading external URL:", iframeUrl);

      toggleButton.onclick = () => {
        buttonOverlay.classList.toggle("hidden");
        toggleButton.textContent = buttonOverlay.classList.contains("hidden") ? "⚙" : "✕";
      };

      aiSDK = createIframeAISDK();
      
      const isPreviewMode = !window.parent || window.parent === window;
      
      if (isPreviewMode) {
        updateStatus("Preview Mode - SDK will work when added to a lesson", "#ffff00");
      } else {
        updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", "#ffff00");
        
        aiSDK.isReady((ready) => {
          if (ready) {
            updateStatus("SDK Ready! All methods available.", "#00ff00");
          }
        });
      }

      const coreLabel = document.createElement("div");
      coreLabel.className = "section-label";
      coreLabel.textContent = "CORE METHODS";
      buttonsContainer.appendChild(coreLabel);

      createButton("Emit Event", () => {
        aiSDK.emitEvent({
          type: "user-selection",
          data: { test: true, timestamp: Date.now() },
          requiresLLMResponse: true,
        });
        updateStatus("Event emitted", "#00ff00");
      });

      createButton("Update State", () => {
        aiSDK.updateState("testKey", { value: Math.random(), timestamp: Date.now() });
        updateStatus("State updated", "#00ff00");
      });

      createButton("Get State", () => {
        aiSDK.getState((state) => {
          updateStatus("State: " + JSON.stringify(state).substring(0, 50), "#00ff00");
        });
      });

      const uiLabel = document.createElement("div");
      uiLabel.className = "section-label";
      uiLabel.textContent = "UI CONTROL METHODS";
      buttonsContainer.appendChild(uiLabel);

      createButton("Minimize Chat UI", () => {
        aiSDK.minimizeChatUI();
        updateStatus("Chat UI minimized", "#00ff00");
      });

      createButton("Show Chat UI", () => {
        aiSDK.showChatUI();
        updateStatus("Chat UI shown", "#00ff00");
      });

      createButton("Activate Fullscreen", () => {
        aiSDK.activateFullscreen();
        updateStatus("Fullscreen activated", "#00ff00");
      });

      createButton("Deactivate Fullscreen", () => {
        aiSDK.deactivateFullscreen();
        updateStatus("Fullscreen deactivated", "#00ff00");
      });

      createButton("Post to Chat", () => {
        const testMessage = "Test message from SDK Test interaction! This is a dummy message to test the postToChat functionality.";
        aiSDK.postToChat(testMessage, "assistant", true);
        updateStatus("Posted to chat: " + testMessage.substring(0, 30) + "...", "#00ff00");
      });

      createButton("Show Script", () => {
        const testScript = "This is a test script block from the SDK Test interaction. It demonstrates the showScript functionality.";
        aiSDK.showScript(testScript, true);
        updateStatus("Script shown: " + testScript.substring(0, 30) + "...", "#00ff00");
      });

      createButton("Show Snack (5s)", () => {
        aiSDK.showSnack("Test snack message! (also posts to chat)", 5000, false, (snackId) => {
          updateStatus("Snack shown: " + snackId, "#00ff00");
        });
      });

      createButton("Show Snack (no chat)", () => {
        aiSDK.showSnack("Test snack message! (hidden from chat)", 5000, true, (snackId) => {
          updateStatus("Snack shown (no chat): " + snackId, "#00ff00");
        });
      });

      createButton("Hide Snack", () => {
        aiSDK.hideSnack();
        updateStatus("Snack hidden", "#00ff00");
      });

      const dataLabel = document.createElement("div");
      dataLabel.className = "section-label";
      dataLabel.textContent = "DATA STORAGE METHODS";
      buttonsContainer.appendChild(dataLabel);

      createButton("Save Instance Data", () => {
        aiSDK.saveInstanceData(
          {
            testValue: Math.random(),
            timestamp: Date.now(),
            testArray: [1, 2, 3],
          },
          (success, error) => {
            if (success) {
              updateStatus("Instance data saved", "#00ff00");
            } else {
              updateStatus("Error: " + error, "#ff0000");
            }
          }
        );
      });

      createButton("Get Instance Data History", () => {
        aiSDK.getInstanceDataHistory(
          { limit: 10 },
          (data, error) => {
            if (data) {
              updateStatus("History: " + data.length + " records", "#00ff00");
            } else {
              updateStatus("Error: " + error, "#ff0000");
            }
          }
        );
      });

      createButton("Save User Progress", () => {
        aiSDK.saveUserProgress(
          {
            score: Math.floor(Math.random() * 100),
            completed: false,
            customData: {
              testField: "test value",
              testNumber: 42,
            },
          },
          (progress, error) => {
            if (progress) {
              updateStatus("Progress saved. Attempts: " + progress.attempts, "#00ff00");
            } else {
              updateStatus("Error: " + error, "#ff0000");
            }
          }
        );
      });

      createButton("Get User Progress", () => {
        aiSDK.getUserProgress((progress, error) => {
          if (progress) {
            updateStatus(
              "Progress: Attempts=" + progress.attempts + ", Completed=" + progress.completed,
              "#00ff00"
            );
          } else if (error) {
            updateStatus("Error: " + error, "#ff0000");
          } else {
            updateStatus("No progress found", "#ffff00");
          }
        });
      });

      createButton("Mark Completed", () => {
        aiSDK.markCompleted((progress, error) => {
          if (progress) {
            updateStatus("Marked as completed", "#00ff00");
          } else {
            updateStatus("Error: " + error, "#ff0000");
          }
        });
      });

      createButton("Increment Attempts", () => {
        aiSDK.incrementAttempts((progress, error) => {
          if (progress) {
            updateStatus("Attempts: " + progress.attempts, "#00ff00");
          } else {
            updateStatus("Error: " + error, "#ff0000");
          }
        });
      });

      createButton("Get User Public Profile", () => {
        aiSDK.getUserPublicProfile(undefined, (profile, error) => {
          if (profile) {
            updateStatus("Profile: " + (profile.displayName || "No name"), "#00ff00");
          } else if (error) {
            updateStatus("Error: " + error, "#ff0000");
          } else {
            updateStatus("No profile found (this is OK)", "#ffff00");
          }
        });
      });

      console.log("[SDK Test iFrame] All buttons created");
    }` : `// Custom overlay code from builder
    (function() {
      // Initialize overlay toggle
      const toggleButton = document.getElementById("toggle-overlay");
      const buttonOverlay = document.getElementById("button-overlay");
      
      if (toggleButton && buttonOverlay) {
        toggleButton.onclick = () => {
          buttonOverlay.classList.toggle("hidden");
          toggleButton.textContent = buttonOverlay.classList.contains("hidden") ? "⚙" : "✕";
        };
      }
      
      // Load external iframe URL
      const externalIframe = document.getElementById("external-iframe");
      if (externalIframe) {
        const iframeUrl = (window.interactionConfig && window.interactionConfig.iframeUrl) || 
                          (window.interactionData && window.interactionData.url) ||
                          'https://en.wikipedia.org/wiki/Main_Page';
        externalIframe.src = iframeUrl;
        console.log("[iFrame Overlay] Loading external URL:", iframeUrl);
      }
      
      // Wait for DOM to be ready, then run builder's code
      // The builder's code may have its own DOM ready checks, so we run it directly
      // but ensure the overlay elements exist first
      const runBuilderCode = () => {
        // Ensure elements exist - wait for them if needed
        let retryCount = 0;
        const maxRetries = 20; // Wait up to 1 second (20 * 50ms)
        
        const checkElements = () => {
          const overlayContent = document.getElementById("overlay-content");
          if (!overlayContent) {
            if (retryCount < maxRetries) {
              retryCount++;
              console.warn("[iFrame Overlay] overlay-content element not found, retrying... (" + retryCount + "/" + maxRetries + ")");
              setTimeout(checkElements, 50);
              return;
            } else {
              console.error("[iFrame Overlay] overlay-content element not found after max retries");
              return;
            }
          }
          
          // Check if HTML content is actually rendered
          let statusText = document.getElementById("status-text");
          let buttonsContainer = document.getElementById("sdk-test-buttons");
          
          // If elements don't exist, create them (for SDK test interactions that need them)
          if (!statusText || !buttonsContainer) {
            // Check if the HTML content looks like it needs SDK test structure
            const needsSDKStructure = ${escapedJs ? 'escapedJs.includes("initTestApp") || escapedJs.includes("sdk-test-buttons") || escapedJs.includes("SDK Test")' : 'false'};
            
            if (needsSDKStructure && overlayContent) {
              console.log("[iFrame Overlay] Creating SDK test structure elements...");
              
              // Create SDK test header and buttons container if they don't exist
              if (!buttonsContainer) {
                // Check if there's already a structure, or create new one
                const existingHeader = overlayContent.querySelector("#sdk-test-header");
                if (!existingHeader) {
                  // Create the SDK test structure
                  const header = document.createElement("div");
                  header.id = "sdk-test-header";
                  header.innerHTML = '<h1>SDK Test iFrame</h1><p id="status-text">Initializing...</p>';
                  overlayContent.appendChild(header);
                  
                  buttonsContainer = document.createElement("div");
                  buttonsContainer.id = "sdk-test-buttons";
                  overlayContent.appendChild(buttonsContainer);
                  
                  statusText = document.getElementById("status-text");
                  console.log("[iFrame Overlay] Created SDK test structure elements");
                } else {
                  buttonsContainer = document.getElementById("sdk-test-buttons");
                  statusText = document.getElementById("status-text");
                }
              }
            }
          }
          
          // Log what we found for debugging
          console.log("[iFrame Overlay] Checking elements:", {
            overlayContent: !!overlayContent,
            overlayContentChildren: overlayContent ? overlayContent.children.length : 0,
            statusText: !!statusText,
            buttonsContainer: !!buttonsContainer,
            htmlContent: overlayContent ? overlayContent.innerHTML.substring(0, 200) : 'none'
          });
          
          // If HTML was injected but elements aren't found yet, wait a bit more
          if (overlayContent.children.length > 0 && !statusText && !buttonsContainer && retryCount < maxRetries) {
            retryCount++;
            console.log("[iFrame Overlay] HTML content present but buttons/status elements not found yet, retrying... (" + retryCount + "/" + maxRetries + ")");
            setTimeout(checkElements, 50);
            return;
          }
          
          // If no HTML content at all and no elements, wait
          if (overlayContent.children.length === 0 && !statusText && !buttonsContainer && retryCount < maxRetries) {
            retryCount++;
            console.warn("[iFrame Overlay] HTML content not rendered yet, retrying... (" + retryCount + "/" + maxRetries + ")");
            setTimeout(checkElements, 50);
            return;
          }
          
          console.log("[iFrame Overlay] Elements ready, running builder's JavaScript code...");
          console.log("[iFrame Overlay] JavaScript code length:", ${escapedJs ? escapedJs.length : 0});
          
          try {
            // Run the builder's JavaScript code directly (no indentation to avoid breaking IIFEs)
${escapedJs ? escapedJs : '            // No JavaScript code provided'}
          } catch (e) {
            console.error("[iFrame Overlay] Error in builder's JavaScript:", e);
            console.error("[iFrame Overlay] Error stack:", e.stack);
            // Show error in overlay
            if (overlayContent) {
              overlayContent.innerHTML = '<div style="color: red; padding: 20px;"><h3>Error in overlay code:</h3><pre style="white-space: pre-wrap;">' + e.message + '</pre></div>';
            }
          }
        };
        
        checkElements();
      };
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runBuilderCode);
      } else {
        // DOM already ready, but wait a bit for elements to be fully rendered
        setTimeout(runBuilderCode, 100);
      }
    })();`}
  </script>
  ${escapedCss ? `<style type="text/css">
${escapedCss}
  </style>` : ''}
</body>
</html>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Create HTML document for interaction build
   */
  private createInteractionHtmlDoc(build: any, config: any, sampleData: any): string {
    const category = build.interactionTypeCategory;
    
    if (category === 'iframe') {
      // For iframe interactions, use wrapper HTML with button overlay
      // Get iframeUrl from config (lesson-builder configured) or build or sampleData
      const iframeUrl = config.iframeUrl || build.iframeUrl || sampleData.url || 'https://en.wikipedia.org/wiki/Main_Page';
      
      // Inject interaction data and config into wrapper
      const sampleDataJson = JSON.stringify(sampleData);
      const configJson = JSON.stringify({ ...config, iframeUrl });
      
      // Check overlay mode from iframeConfig
      const overlayMode = build.iframeConfig?.overlayMode || 'overlay';
      console.log('[LessonView] 🎛️ createInteractionHtmlDoc - overlayMode:', overlayMode, 'iframeConfig:', build.iframeConfig);
      
      // Check if there's HTML/CSS/JS code to display
      const hasOverlayCode = !!(build.htmlCode || build.cssCode || build.jsCode);
      console.log('[LessonView] 🎛️ createInteractionHtmlDoc - hasOverlayCode:', hasOverlayCode);
      
      if (hasOverlayCode && overlayMode === 'overlay') {
        console.log('[LessonView] 🎛️ Using overlay wrapper (overlayMode is overlay)');
        // Overlay mode: use wrapper with custom HTML/CSS/JS code from builder (overlay on top)
        const htmlCode = (build.htmlCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
        const cssCode = (build.cssCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
        const jsCode = (build.jsCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
        
        return this.createIframeWrapperWithOverlay(iframeUrl, configJson, sampleDataJson, htmlCode, cssCode, jsCode, false);
      } else {
        // Section mode OR no code: create simple iframe wrapper (no overlay in blob URL)
        // When overlayMode is 'section', the HTML/CSS/JS will be rendered below the iframe in the template
        console.log('[LessonView] 🎛️ Using simple iframe wrapper (overlayMode is section or no code)');
        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body { margin: 0; padding: 0; height: auto; min-height: 100%; overflow-y: auto; overflow-x: hidden; }
    body { width: 100%; }
    iframe { width: 100%; height: 100vh; border: none; }
    /* Dark scrollbar styling */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(0, 212, 255, 0.3);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 212, 255, 0.5);
    }
  </style>
</head>
<body>
  <iframe src="${this.escapeHtml(iframeUrl)}" frameborder="0" allowfullscreen></iframe>
  <script type="text/javascript">
    window.interactionData = ${sampleDataJson};
    window.interactionConfig = ${configJson};
  </script>
</body>
</html>`;
      }
    }

    // For HTML and PixiJS interactions, create full HTML document
    // Normalize line endings first (handle \r\n and \r)
    const normalizedHtml = (build.htmlCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    const normalizedCss = (build.cssCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    const normalizedJs = (build.jsCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    
    // For HTML and CSS, escape for template literal injection
    const escapedHtml = normalizedHtml ? normalizedHtml.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${').replace(/<\/script>/gi, '<\\/script>') : '';
    const escapedCss = normalizedCss ? normalizedCss.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${') : '';
    
    // For JavaScript, use base64 encoding to safely embed code with template literals
    // This avoids all template literal escaping issues
    // Use UTF-8 safe encoding to handle any Unicode characters in the code
    
    // Debug: Log if snack buttons are in the code
    console.log('[LessonView] 🔍 JS code includes "Show Snack (5s)":', normalizedJs.includes('Show Snack (5s)'));
    console.log('[LessonView] 🔍 JS code includes "Show Snack (no chat)":', normalizedJs.includes('Show Snack (no chat)'));
    console.log('[LessonView] 🔍 JS code length:', normalizedJs.length);
    console.log('[LessonView] 🔍 HTML code length:', normalizedHtml.length);
    console.log('[LessonView] 🔍 HTML code includes input field:', normalizedHtml.includes('image-prompt-input'));
    
    // Inject interaction data and config
    const sampleDataJsonBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(sampleData || {}))));
    const configJsonBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(config || {}))));
    const htmlBase64 = btoa(unescape(encodeURIComponent(normalizedHtml || '')));
    const cssBase64 = btoa(unescape(encodeURIComponent(normalizedCss || '')));
    const jsCodeBase64 = btoa(unescape(encodeURIComponent(normalizedJs || '')));

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body { margin: 0; padding: 0; height: auto; min-height: 100%; overflow-y: auto; overflow-x: hidden; }
    body { width: 100%; }
    /* Dark scrollbar styling */
    ::-webkit-scrollbar {
      width: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(0, 212, 255, 0.3);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 212, 255, 0.5);
    }
    
    /* Widget Styles */
    .widget-carousel-section {
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
      font-family: sans-serif;
      color: white;
    }
    .widget-carousel-header {
      padding: 10px 15px !important;
      background: rgba(255, 255, 255, 0.1) !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      font-weight: bold !important;
      user-select: none !important;
    }
    .widget-carousel-toggle {
      display: inline-block !important;
      transition: transform 0.3s !important;
      font-size: 12px !important;
    }
    .widget-carousel-content {
      padding: 15px !important;
      border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
    .carousel-image-container {
      position: relative !important;
      width: 100% !important;
      height: 250px !important;
      background: #000 !important;
      border-radius: 4px !important;
      overflow: hidden !important;
      margin-bottom: 10px !important;
    }
    .carousel-image {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
    }
    .carousel-controls {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-top: 10px !important;
    }
    .carousel-btn {
      background: rgba(0, 212, 255, 0.2) !important;
      border: 1px solid rgba(0, 212, 255, 0.4) !important;
      color: white !important;
      padding: 5px 15px !important;
      border-radius: 4px !important;
      cursor: pointer !important;
    }
    .carousel-btn:hover {
      background: rgba(0, 212, 255, 0.4) !important;
    }
    .carousel-info {
      font-size: 12px !important;
      color: rgba(255, 255, 255, 0.7) !important;
    }
  </style>
  <div id="interaction-css-container"></div>
</head>
<body>
  <div id="interaction-html-container"></div>
  <script type="text/plain" id="interaction-js-code" data-base64="${jsCodeBase64}"></script>
  <script type="text/plain" id="interaction-html-base64" data-base64="${htmlBase64}"></script>
  <script type="text/plain" id="interaction-css-base64" data-base64="${cssBase64}"></script>
  <script type="text/plain" id="interaction-data-base64" data-base64="${sampleDataJsonBase64}"></script>
  <script type="text/plain" id="interaction-config-base64" data-base64="${configJsonBase64}"></script>
  <script type="text/javascript">
    (function() {
      try {
        const decodeBase64 = (base64) => {
          if (!base64) return '';
          return decodeURIComponent(escape(window.atob(base64)));
        };
        
        // Inject HTML
        const htmlElem = document.getElementById('interaction-html-base64');
        if (htmlElem) {
          document.getElementById('interaction-html-container').innerHTML = decodeBase64(htmlElem.getAttribute('data-base64'));
        }
        
        // Inject CSS
        const cssElem = document.getElementById('interaction-css-base64');
        if (cssElem) {
          const css = decodeBase64(cssElem.getAttribute('data-base64'));
          if (css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
          }
        }

        // Parse Data and Config
        const dataElem = document.getElementById('interaction-data-base64');
        const configElem = document.getElementById('interaction-config-base64');
        const dataStr = dataElem ? decodeBase64(dataElem.getAttribute('data-base64')) : '{}';
        const configStr = configElem ? decodeBase64(configElem.getAttribute('data-base64')) : '{}';
        window.interactionData = JSON.parse(dataStr);
        window.interactionConfig = JSON.parse(configStr);
        console.log("[Interaction] Data injected:", window.interactionData);
        console.log("[Interaction] Config injected:", window.interactionConfig);
        console.log("[Interaction] Config widgetConfigs:", window.interactionConfig?.widgetConfigs);
        // Log detailed structure of widget configs
        if (window.interactionConfig?.widgetConfigs) {
          Object.keys(window.interactionConfig.widgetConfigs).forEach(function(instanceId) {
            const widgetConfig = window.interactionConfig.widgetConfigs[instanceId];
            console.log("[Interaction] Widget config for " + instanceId + ":", {
              type: widgetConfig.type,
              hasConfig: !!widgetConfig.config,
              configKeys: widgetConfig.config ? Object.keys(widgetConfig.config) : [],
              imageIds: widgetConfig.config?.imageIds,
              imageIdsType: typeof widgetConfig.config?.imageIds,
              imageIdsIsArray: Array.isArray(widgetConfig.config?.imageIds),
              fullConfig: JSON.stringify(widgetConfig.config, null, 2)
            });
          });
        }
      } catch (e) {
        console.error("[Interaction] Error setting data:", e);
        window.interactionData = window.interactionData || {};
        window.interactionConfig = window.interactionConfig || {};
      }
    })();
  </script>
  <script type="text/javascript">
    // Initialize SDK for widget support (inject createIframeAISDK)
    (function() {
      if (typeof window.createIframeAISDK === 'undefined') {
        window.createIframeAISDK = () => {
          let subscriptionId = null;
          let requestCounter = 0;
          const generateRequestId = () => \`req-\${Date.now()}-\${++requestCounter}\`;
          const sendMessage = (type, data, callback) => {
            const requestId = generateRequestId();
            const message = { type, requestId, ...data };
            if (callback) {
              const listener = (event) => {
                if (event.data.requestId === requestId) {
                  window.removeEventListener("message", listener);
                  callback(event.data);
                }
              };
              window.addEventListener("message", listener);
            }
            window.parent.postMessage(message, "*");
          };
          return {
            isReady: (callback) => {
              const listener = (event) => {
                if (event.data.type === "ai-sdk-ready") {
                  window.removeEventListener("message", listener);
                  if (callback) callback(true);
                }
              };
              window.addEventListener("message", listener);
            },
            emitEvent: (event, processedContentId) => {
              sendMessage("ai-sdk-emit-event", { event, processedContentId });
            },
            updateState: (key, value) => {
              sendMessage("ai-sdk-update-state", { key, value });
            },
            getState: (callback) => {
              sendMessage("ai-sdk-get-state", {}, (response) => {
                callback(response.state);
              });
            },
            completeInteraction: function() {
              sendMessage("ai-sdk-complete-interaction", {});
            },
            // Widget Management
            _widgetInstances: new Map(),
            _currentLessonId: null,
            _currentAccountId: null,
            // Widget Implementation Functions (from sdk-test-html)
            _initImageCarousel: function(instanceId, config) {
              const instance = this._widgetInstances.get(instanceId);
              if (!instance) return;
              
              // Look for existing widget container in HTML (allows builders to position it)
              let widgetSection = document.getElementById('widget-section-' + instanceId);
              let contentContainer = document.getElementById('widget-carousel-content-' + instanceId);
              let container = document.getElementById('widget-carousel-' + instanceId);
              
              // If container doesn't exist in HTML, create it dynamically
              if (!container) {
                console.log('[Widget] Container not found in HTML, creating dynamically for', instanceId);
                
                // Get or create widgets container at end of body (expands document)
                let widgetsContainer = document.getElementById('widgets-container');
                if (!widgetsContainer) {
                  widgetsContainer = document.createElement('div');
                  widgetsContainer.id = 'widgets-container';
                  widgetsContainer.style.position = 'relative';
                  widgetsContainer.style.width = '100%';
                  widgetsContainer.style.minHeight = '0';
                  widgetsContainer.style.marginTop = '20px';
                  widgetsContainer.style.paddingTop = '20px';
                  widgetsContainer.style.borderTop = '1px solid rgba(0, 212, 255, 0.2)';
                  widgetsContainer.style.display = 'flex';
                  widgetsContainer.style.flexDirection = 'column';
                  widgetsContainer.style.gap = '20px';
                  document.body.appendChild(widgetsContainer);
                }
                
                // Create collapsible widget section
                widgetSection = document.createElement('div');
                widgetSection.id = 'widget-section-' + instanceId;
                widgetSection.className = 'widget-carousel-section';
                
                // Create header with toggle button
                const header = document.createElement('div');
                header.className = 'widget-carousel-header';
                
                const toggleIcon = document.createElement('span');
                toggleIcon.className = 'widget-carousel-toggle';
                toggleIcon.textContent = '▼';
                
                const headerTitle = document.createElement('span');
                headerTitle.textContent = '🖼️ Image Carousel Widget';
                
                header.appendChild(toggleIcon);
                header.appendChild(headerTitle);
                
                // Create content container (collapsible)
                contentContainer = document.createElement('div');
                contentContainer.id = 'widget-carousel-content-' + instanceId;
                contentContainer.className = 'widget-carousel-content';
                
                // Create carousel container
                container = document.createElement('div');
                container.id = 'widget-carousel-' + instanceId;
                container.style.position = 'relative';
                container.style.width = '100%';
                container.style.zIndex = '1';
                
                contentContainer.appendChild(container);
                widgetSection.appendChild(header);
                widgetSection.appendChild(contentContainer);
                
                // Toggle functionality (closed by default)
                let isExpanded = false;
                contentContainer.style.display = 'none';
                toggleIcon.textContent = '▶';
                toggleIcon.style.transform = 'rotate(-90deg)';
                header.addEventListener('click', () => {
                  isExpanded = !isExpanded;
                  contentContainer.style.display = isExpanded ? 'block' : 'none';
                  toggleIcon.textContent = isExpanded ? '▼' : '▶';
                  toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
                });
                
                // Position widget section within widgets container (stacked, expands document)
                widgetSection.style.position = 'relative';
                widgetSection.style.width = '100%';
                widgetSection.style.maxWidth = '100%';
                widgetSection.style.margin = '0 auto 20px auto';
                widgetSection.style.zIndex = '1';
                widgetSection.style.boxSizing = 'border-box';
                widgetSection.style.display = 'block';
                
                // Append to widgets container (which expands document)
                widgetsContainer.appendChild(widgetSection);
              } else {
                console.log('[Widget] Using existing widget container from HTML for', instanceId);
                
                // If container exists, find the section and content container
                if (!widgetSection) {
                  widgetSection = container.closest('#widget-section-' + instanceId);
                }
                if (!contentContainer) {
                  contentContainer = document.getElementById('widget-carousel-content-' + instanceId);
                }
                
                // Set up toggle functionality if header exists (closed by default)
                const header = widgetSection?.querySelector('.widget-carousel-header');
                if (header && contentContainer) {
                  const toggleIcon = header.querySelector('.widget-carousel-toggle');
                  let isExpanded = false;
                  contentContainer.style.display = 'none';
                  if (toggleIcon) {
                    toggleIcon.textContent = '▶';
                    toggleIcon.style.transform = 'rotate(-90deg)';
                  }
                  
                  header.addEventListener('click', () => {
                    isExpanded = !isExpanded;
                    contentContainer.style.display = isExpanded ? 'block' : 'none';
                    if (toggleIcon) {
                      toggleIcon.textContent = isExpanded ? '▼' : '▶';
                      toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
                    }
                  });
                }
              }
              
              instance.element = container;
              instance.section = widgetSection;
              instance.currentIndex = 0;
              instance.images = [];
              instance.containers = [];
              instance.config = config || {};
              
              // Clear any existing autoplay interval before setting up new one
              if (instance.autoplayInterval) {
                clearInterval(instance.autoplayInterval);
                instance.autoplayInterval = null;
              }
              
              // Set defaults if not provided
              if (instance.config.showControls === undefined) instance.config.showControls = true;
              if (instance.config.showIndicators === undefined) instance.config.showIndicators = true;
              
              console.log('[Widget] initImageCarousel - config:', instance.config);
              console.log('[Widget] initImageCarousel - config parameter:', config);
              console.log('[Widget] initImageCarousel - config.imageIds:', config.imageIds);
              console.log('[Widget] initImageCarousel - instance.config.imageIds:', instance.config.imageIds);
              
              // Load images if imageIds provided - check both config and instance.config
              const imageIds = config.imageIds || instance.config.imageIds || [];
              console.log('[Widget] initImageCarousel - resolved imageIds:', imageIds, 'length:', imageIds.length);
              
              if (imageIds && imageIds.length > 0) {
                console.log('[Widget] initImageCarousel - calling loadCarouselImages with', imageIds.length, 'image IDs:', imageIds);
                // Store imageIds in instance config for later use
                instance.config.imageIds = imageIds;
                this._loadCarouselImages(instanceId, imageIds);
              } else {
                console.warn('[Widget] initImageCarousel - No image IDs found in config');
                container.innerHTML = '<div style="color: rgba(255,255,255,0.7); padding: 20px; text-align: center;">No image IDs configured. Add image IDs in the Interaction Builder.</div>';
              }
              
              // Setup autoplay if enabled (only if autoplay is explicitly true)
              if (config.autoplay === true) {
                const interval = config.interval || 3000;
                instance.autoplayInterval = setInterval(() => {
                  if (instance.carouselNext) {
                    instance.carouselNext();
                  }
                }, interval);
                console.log('[Widget] Autoplay enabled with interval:', interval, 'ms');
              } else {
                console.log('[Widget] Autoplay disabled');
              }
              
              // Store methods in instance
              const self = this;
              instance.carouselNext = () => {
                if (instance.images.length === 0) return;
                instance.currentIndex = (instance.currentIndex + 1) % instance.images.length;
                self._updateCarouselDisplay(instanceId);
              };
              
              instance.carouselPrevious = () => {
                if (instance.images.length === 0) return;
                instance.currentIndex = (instance.currentIndex - 1 + instance.images.length) % instance.images.length;
                self._updateCarouselDisplay(instanceId);
              };
              
              instance.carouselGoTo = (index) => {
                if (index >= 0 && index < instance.images.length) {
                  instance.currentIndex = index;
                  self._updateCarouselDisplay(instanceId);
                }
              };
            },
            _loadCarouselImages: function(instanceId, imageIds) {
              console.log('[Widget] loadCarouselImages called for', instanceId, 'with', imageIds.length, 'image IDs:', imageIds);
              console.log('[Widget] loadCarouselImages - _currentLessonId:', this._currentLessonId);
              const instance = this._widgetInstances.get(instanceId);
              if (!instance) {
                console.error('[Widget] loadCarouselImages - instance not found for', instanceId);
                return;
              }
              
              if (!this._currentLessonId) {
                console.error('[Widget] loadCarouselImages - _currentLessonId is not set! Cannot load images.');
                const container = instance.element;
                if (container) {
                  container.innerHTML = '<div style="color: rgba(255,255,255,0.7); padding: 20px; text-align: center;">Error: Lesson ID not available. Cannot load images.</div>';
                }
                return;
              }
              
              const self = this;
              // Use sendMessage to load images
              console.log('[Widget] loadCarouselImages - sending message to load images for lesson:', this._currentLessonId);
              sendMessage("ai-sdk-get-lesson-images", { lessonId: this._currentLessonId, accountId: null, imageId: null }, (response) => {
                console.log('[Widget] loadCarouselImages - response received:', {
                  hasError: !!response.error,
                  error: response.error,
                  imagesCount: response.images ? response.images.length : 0,
                  imageIds: response.images ? response.images.map(img => img.id) : []
                });
                
                if (response.error) {
                  console.error('[Widget] Error loading carousel images:', response.error);
                  const container = instance.element;
                  if (container) {
                    container.innerHTML = '<div style="color: rgba(255,100,100,0.9); padding: 20px; text-align: center;">Error loading images: ' + response.error + '</div>';
                  }
                  return;
                }
                
                const images = response.images || [];
                console.log('[Widget] loadCarouselImages - loaded', images.length, 'total images');
                console.log('[Widget] loadCarouselImages - looking for image IDs:', imageIds);
                console.log('[Widget] loadCarouselImages - available image IDs:', images.map(img => img.id));
                
                // Filter images by IDs
                const filteredImages = images.filter(img => imageIds.includes(img.id));
                console.log('[Widget] loadCarouselImages - filtered to', filteredImages.length, 'images');
                console.log('[Widget] loadCarouselImages - filtered image IDs:', filteredImages.map(img => img.id));
                
                if (filteredImages.length === 0) {
                  console.warn('[Widget] loadCarouselImages - No images found matching the provided IDs');
                  const container = instance.element;
                  if (container) {
                    container.innerHTML = '<div style="color: rgba(255,255,255,0.7); padding: 20px; text-align: center;">No images found for the configured image IDs. Please check the image IDs in the widget configuration.</div>';
                  }
                  return;
                }
                
                instance.images = filteredImages;
                
                // Create carousel display
                self._createCarouselDisplay(instanceId);
              });
            },
            _createCarouselDisplay: function(instanceId) {
              const instance = this._widgetInstances.get(instanceId);
              if (!instance || !instance.element) return;
              
              // Ensure config exists and has defaults
              if (!instance.config) {
                instance.config = {};
              }
              if (instance.config.showControls === undefined) {
                instance.config.showControls = true;
              }
              if (instance.config.showIndicators === undefined) {
                instance.config.showIndicators = true;
              }
              
              console.log('[Widget] createCarouselDisplay - images count:', instance.images.length);
              
              const container = instance.element;
              
              // Preserve HTML container if it exists before clearing
              const existingHtmlContainer = container.querySelector('.carousel-html-container');
              let htmlContainerClone = null;
              if (existingHtmlContainer) {
                // Clone the container to preserve it (but don't clone event listeners)
                htmlContainerClone = existingHtmlContainer.cloneNode(true);
              }
              
              // Clear all content
              container.innerHTML = '';
              
              // Create image container with responsive sizing to fit screen
              const imageContainer = document.createElement('div');
              imageContainer.style.position = 'relative';
              imageContainer.style.width = '100%';
              imageContainer.style.maxWidth = '100%';
              imageContainer.style.minHeight = '200px';
              imageContainer.style.maxHeight = '70vh';
              imageContainer.style.overflow = 'hidden';
              imageContainer.style.display = 'flex';
              imageContainer.style.alignItems = 'center';
              imageContainer.style.justifyContent = 'center';
              imageContainer.style.boxSizing = 'border-box';
              
              // Create image element with responsive sizing to fit screen
              const img = document.createElement('img');
              img.style.maxWidth = '100%';
              img.style.maxHeight = '70vh';
              img.style.width = 'auto';
              img.style.height = 'auto';
              img.style.display = 'block';
              img.style.objectFit = 'contain';
              img.style.boxSizing = 'border-box';
              imageContainer.appendChild(img);
              
              // Create controls if enabled
              const showControls = instance.config.showControls !== false;
              if (showControls && instance.images.length > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.textContent = '◀';
                prevBtn.style.position = 'absolute';
                prevBtn.style.left = '10px';
                prevBtn.style.top = '50%';
                prevBtn.style.transform = 'translateY(-50%)';
                prevBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.8)';
                prevBtn.style.border = '2px solid #00d4ff';
                prevBtn.style.borderRadius = '50%';
                prevBtn.style.width = '40px';
                prevBtn.style.height = '40px';
                prevBtn.style.color = '#ffffff';
                prevBtn.style.fontSize = '18px';
                prevBtn.style.fontWeight = 'bold';
                prevBtn.style.cursor = 'pointer';
                prevBtn.style.zIndex = '10';
                prevBtn.style.display = 'flex';
                prevBtn.style.alignItems = 'center';
                prevBtn.style.justifyContent = 'center';
                prevBtn.style.transition = 'all 0.2s ease';
                prevBtn.onmouseover = () => {
                  prevBtn.style.backgroundColor = 'rgba(0, 212, 255, 1)';
                  prevBtn.style.transform = 'translateY(-50%) scale(1.1)';
                };
                prevBtn.onmouseout = () => {
                  prevBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.8)';
                  prevBtn.style.transform = 'translateY(-50%) scale(1)';
                };
                prevBtn.onclick = (e) => {
                  e.stopPropagation();
                  if (instance.carouselPrevious) instance.carouselPrevious();
                };
                imageContainer.appendChild(prevBtn);
                
                const nextBtn = document.createElement('button');
                nextBtn.textContent = '▶';
                nextBtn.style.position = 'absolute';
                nextBtn.style.right = '10px';
                nextBtn.style.top = '50%';
                nextBtn.style.transform = 'translateY(-50%)';
                nextBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.8)';
                nextBtn.style.border = '2px solid #00d4ff';
                nextBtn.style.borderRadius = '50%';
                nextBtn.style.width = '40px';
                nextBtn.style.height = '40px';
                nextBtn.style.color = '#ffffff';
                nextBtn.style.fontSize = '18px';
                nextBtn.style.fontWeight = 'bold';
                nextBtn.style.cursor = 'pointer';
                nextBtn.style.zIndex = '10';
                nextBtn.style.display = 'flex';
                nextBtn.style.alignItems = 'center';
                nextBtn.style.justifyContent = 'center';
                nextBtn.style.transition = 'all 0.2s ease';
                nextBtn.onmouseover = () => {
                  nextBtn.style.backgroundColor = 'rgba(0, 212, 255, 1)';
                  nextBtn.style.transform = 'translateY(-50%) scale(1.1)';
                };
                nextBtn.onmouseout = () => {
                  nextBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.8)';
                  nextBtn.style.transform = 'translateY(-50%) scale(1)';
                };
                nextBtn.onclick = (e) => {
                  e.stopPropagation();
                  if (instance.carouselNext) instance.carouselNext();
                };
                imageContainer.appendChild(nextBtn);
              }
              
              container.appendChild(imageContainer);
              
              // Create indicators if enabled
              const showIndicators = instance.config.showIndicators !== false;
              if (showIndicators && instance.images.length > 1) {
                const indicators = document.createElement('div');
                indicators.style.textAlign = 'center';
                indicators.style.marginTop = '15px';
                indicators.style.padding = '10px';
                for (let i = 0; i < instance.images.length; i++) {
                  const indicator = document.createElement('span');
                  indicator.style.display = 'inline-block';
                  indicator.style.width = '12px';
                  indicator.style.height = '12px';
                  indicator.style.borderRadius = '50%';
                  indicator.style.backgroundColor = i === instance.currentIndex ? '#00d4ff' : 'rgba(255, 255, 255, 0.4)';
                  indicator.style.border = '2px solid #00d4ff';
                  indicator.style.margin = '0 5px';
                  indicator.style.cursor = 'pointer';
                  indicator.style.transition = 'all 0.2s ease';
                  indicator.onmouseover = () => {
                    if (i !== instance.currentIndex) {
                      indicator.style.backgroundColor = 'rgba(0, 212, 255, 0.6)';
                      indicator.style.transform = 'scale(1.2)';
                    }
                  };
                  indicator.onmouseout = () => {
                    if (i !== instance.currentIndex) {
                      indicator.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                      indicator.style.transform = 'scale(1)';
                    }
                  };
                  indicator.onclick = (e) => {
                    e.stopPropagation();
                    if (instance.carouselGoTo) instance.carouselGoTo(i);
                  };
                  indicators.appendChild(indicator);
                }
                container.appendChild(indicators);
              }
              
              this._updateCarouselDisplay(instanceId);
              
              // Restore HTML container AFTER all carousel content (image, controls, indicators)
              // This ensures it appears BELOW the widget content, not above
              if (htmlContainerClone) {
                container.appendChild(htmlContainerClone);
                // Re-attach toggle event listener since cloneNode doesn't preserve event listeners
                const restoredContainer = container.querySelector('.carousel-html-container');
                if (restoredContainer && instance.config.container && instance.config.container.showToggle) {
                  const header = restoredContainer.querySelector('div[style*="cursor: pointer"]');
                  const contentArea = restoredContainer.querySelector('.carousel-html-content');
                  if (header && contentArea) {
                    // Remove any existing listeners and add fresh one
                    const newHeader = header.cloneNode(true);
                    header.parentNode.replaceChild(newHeader, header);
                    // Get toggle icon from the new header
                    const newToggleIcon = newHeader.querySelector('span[style*="color: #00d4ff"]');
                    newHeader.addEventListener('click', () => {
                      const isCurrentlyVisible = contentArea.style.display !== 'none';
                      contentArea.style.display = isCurrentlyVisible ? 'none' : 'block';
                      if (newToggleIcon) {
                        newToggleIcon.textContent = isCurrentlyVisible ? '▶' : '▼';
                        newToggleIcon.style.transform = isCurrentlyVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
                      }
                    });
                  }
                }
              }
              
              // Create HTML container below images if enabled (only if it doesn't already exist)
              if (instance.config.container && instance.config.container.enabled && !htmlContainerClone) {
                this._createCarouselHTMLContainer(instanceId);
              }
            },
            _createCarouselHTMLContainer: function(instanceId) {
              const instance = this._widgetInstances.get(instanceId);
              if (!instance || !instance.element) return;
              
              // Check if container already exists inside instance.element
              const existingContainer = instance.element.querySelector('.carousel-html-container');
              if (existingContainer) {
                // Container already exists, just update visibility of content area
                const contentArea = existingContainer.querySelector('.carousel-html-content');
                const existingIsVisible = instance.config.container.defaultVisible !== false;
                if (contentArea) {
                  contentArea.style.display = existingIsVisible ? 'block' : 'none';
                  // Update toggle icon if it exists
                  const toggleIcon = existingContainer.querySelector('.widget-collapsible-icon, span[style*="color: #00d4ff"]');
                  if (toggleIcon) {
                    toggleIcon.textContent = existingIsVisible ? '▼' : '▶';
                    toggleIcon.style.transform = existingIsVisible ? 'rotate(0deg)' : 'rotate(-90deg)';
                  }
                }
                return;
              }
              
              // Create container div - pinned to bottom of widget content
              const htmlContainer = document.createElement('div');
              htmlContainer.className = 'carousel-html-container';
              htmlContainer.style.marginTop = '20px';
              htmlContainer.style.padding = '15px';
              htmlContainer.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
              htmlContainer.style.border = '1px solid rgba(0, 212, 255, 0.3)';
              htmlContainer.style.borderRadius = '8px';
              htmlContainer.style.width = '100%';
              htmlContainer.style.position = 'relative';
              htmlContainer.style.zIndex = '1';
              htmlContainer.style.boxSizing = 'border-box';
              htmlContainer.style.clear = 'both';
              
              // Set initial visibility based on defaultVisible
              // Always show the container itself, only hide/show the content area
              const isVisible = instance.config.container.defaultVisible !== false;
              
              // Create header with toggle button if showToggle is enabled
              if (instance.config.container.showToggle) {
                const header = document.createElement('div');
                header.style.display = 'flex';
                header.style.alignItems = 'center';
                header.style.justifyContent = 'space-between';
                header.style.marginBottom = '10px';
                header.style.cursor = 'pointer';
                header.style.padding = '8px';
                header.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
                header.style.borderRadius = '4px';
                
                const headerText = document.createElement('span');
                headerText.textContent = 'HTML Content';
                headerText.style.color = '#ffffff';
                headerText.style.fontWeight = 'bold';
                
                const toggleIcon = document.createElement('span');
                toggleIcon.className = 'carousel-html-toggle-icon';
                toggleIcon.textContent = isVisible ? '▼' : '▶';
                toggleIcon.style.color = '#00d4ff';
                toggleIcon.style.transition = 'transform 0.3s';
                toggleIcon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(-90deg)';
                
                header.appendChild(headerText);
                header.appendChild(toggleIcon);
                
                // Toggle functionality - only hide/show content area, not the whole container
                header.addEventListener('click', () => {
                  const contentArea = htmlContainer.querySelector('.carousel-html-content');
                  if (contentArea) {
                    const isCurrentlyVisible = contentArea.style.display !== 'none';
                    contentArea.style.display = isCurrentlyVisible ? 'none' : 'block';
                    toggleIcon.textContent = isCurrentlyVisible ? '▶' : '▼';
                    toggleIcon.style.transform = isCurrentlyVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
                  }
                });
                
                htmlContainer.appendChild(header);
              }
              
              // Create content area with default HTML
              const contentArea = document.createElement('div');
              contentArea.className = 'carousel-html-content';
              contentArea.style.color = '#ffffff';
              contentArea.innerHTML = \`
                <div style="padding: 10px;">
                  <h4 style="color: #00d4ff; margin: 0 0 10px 0;">HTML Container Example</h4>
                  <p style="margin: 0 0 10px 0;">This is a default HTML container below the image carousel. You can add custom HTML content here.</p>
                  <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 0.9em;">To customize this content, add HTML in your interaction code that targets the container with class "carousel-html-content".</p>
                </div>
              \`;
              // Set initial visibility based on defaultVisible (isVisible already declared above)
              contentArea.style.display = isVisible ? 'block' : 'none';
              htmlContainer.appendChild(contentArea);
              
              // Store content area reference for toggle functionality
              htmlContainer.contentArea = contentArea;
              
              // Insert container at the end of instance.element (after all carousel content: image, controls, indicators)
              // This ensures it appears below the widget content, not on top
              // Use appendChild to ensure it's always at the bottom
              instance.element.appendChild(htmlContainer);
              
              // Ensure container stays at bottom by setting order
              htmlContainer.style.order = '999';
              htmlContainer.style.position = 'relative';
              htmlContainer.style.zIndex = '1';
              
              // Store reference for later updates
              instance.htmlContainer = htmlContainer;
            },
            _updateCarouselDisplay: function(instanceId) {
              const instance = this._widgetInstances.get(instanceId);
              if (!instance || !instance.element || instance.images.length === 0) return;
              
              const img = instance.element.querySelector('img');
              if (img && instance.images[instance.currentIndex]) {
                const image = instance.images[instance.currentIndex];
                const imageUrl = image.imageUrl || image.url || '';
                if (imageUrl) {
                  img.src = imageUrl;
                  img.alt = image.id || image.prompt || '';
                  console.log('[Widget] Carousel displaying image:', instance.currentIndex, imageUrl);
                } else {
                  console.warn('[Widget] Carousel image has no URL:', image);
                }
              }
              
              // Update indicators
              const indicatorsContainer = Array.from(instance.element.querySelectorAll('div')).find(div => {
                const spans = div.querySelectorAll('span');
                return spans.length > 0 && Array.from(spans).every(span => span.style.borderRadius === '50%');
              });
              if (indicatorsContainer) {
                const indicators = indicatorsContainer.querySelectorAll('span');
                indicators.forEach((indicator, index) => {
                  if (index === instance.currentIndex) {
                    indicator.style.backgroundColor = '#00d4ff';
                    indicator.style.transform = 'scale(1.2)';
                  } else {
                    indicator.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                    indicator.style.transform = 'scale(1)';
                  }
                });
              }
            },
            _initTimer: function(instanceId, config) {
              console.log('[Widget] initTimer called with:', { instanceId, config });
              console.log('[Widget] initTimer - config parameter details:', {
                hasConfig: !!config,
                hasConfigConfig: !!(config && config.config),
                configKeys: config ? Object.keys(config) : [],
                hideControls: config?.hideControls,
                configHideControls: config?.config?.hideControls
              });
              const instance = this._widgetInstances.get(instanceId);
              if (!instance) {
                console.error('[Widget] initTimer - instance not found for', instanceId);
                return;
              }
              
              // Look for existing widget container in HTML
              let widgetSection = document.getElementById('widget-section-' + instanceId);
              let contentContainer = document.getElementById('widget-carousel-content-' + instanceId);
              let container = document.getElementById('widget-timer-' + instanceId);
              
              // If container doesn't exist in HTML, create it dynamically
              if (!container) {
                console.log('[Widget] Timer container not found in HTML, creating dynamically for', instanceId);
                
                // Get or create widgets container at end of body (expands document)
                let widgetsContainer = document.getElementById('widgets-container');
                if (!widgetsContainer) {
                  widgetsContainer = document.createElement('div');
                  widgetsContainer.id = 'widgets-container';
                  widgetsContainer.style.position = 'relative';
                  widgetsContainer.style.width = '100%';
                  widgetsContainer.style.minHeight = '0';
                  widgetsContainer.style.marginTop = '20px';
                  widgetsContainer.style.paddingTop = '20px';
                  widgetsContainer.style.borderTop = '1px solid rgba(0, 212, 255, 0.2)';
                  widgetsContainer.style.display = 'flex';
                  widgetsContainer.style.flexDirection = 'column';
                  widgetsContainer.style.gap = '20px';
                  document.body.appendChild(widgetsContainer);
                }
                
                // Create collapsible widget section
                widgetSection = document.createElement('div');
                widgetSection.id = 'widget-section-' + instanceId;
                widgetSection.className = 'widget-carousel-section';
                
                // Create header with toggle button
                const header = document.createElement('div');
                header.className = 'widget-carousel-header';
                
                const toggleIcon = document.createElement('span');
                toggleIcon.className = 'widget-carousel-toggle';
                toggleIcon.textContent = '▼';
                
                const headerTitle = document.createElement('span');
                headerTitle.textContent = '⏱️ Timer Widget';
                
                header.appendChild(toggleIcon);
                header.appendChild(headerTitle);
                
                // Create content container (collapsible)
                contentContainer = document.createElement('div');
                contentContainer.id = 'widget-carousel-content-' + instanceId;
                contentContainer.className = 'widget-carousel-content';
                
                // Create timer container
                container = document.createElement('div');
                container.id = 'widget-timer-' + instanceId;
                container.style.position = 'relative';
                container.style.width = '100%';
                container.style.zIndex = '1';
                container.style.padding = '20px';
                container.style.textAlign = 'center';
                
                contentContainer.appendChild(container);
                widgetSection.appendChild(header);
                widgetSection.appendChild(contentContainer);
                
                // Toggle functionality (closed by default)
                let isExpanded = false;
                contentContainer.style.display = 'none';
                toggleIcon.textContent = '▶';
                toggleIcon.style.transform = 'rotate(-90deg)';
                header.addEventListener('click', () => {
                  isExpanded = !isExpanded;
                  contentContainer.style.display = isExpanded ? 'block' : 'none';
                  toggleIcon.textContent = isExpanded ? '▼' : '▶';
                  toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
                });
                
                // Position widget section within widgets container (stacked, expands document)
                widgetSection.style.position = 'relative';
                widgetSection.style.width = '100%';
                widgetSection.style.maxWidth = '100%';
                widgetSection.style.margin = '0 auto 20px auto';
                widgetSection.style.zIndex = '1';
                widgetSection.style.boxSizing = 'border-box';
                widgetSection.style.display = 'block';
                
                // Append to widgets container (which expands document)
                widgetsContainer.appendChild(widgetSection);
              } else {
                console.log('[Widget] Using existing timer container from HTML for', instanceId);
                
                // If container exists, find the section and content container
                if (!widgetSection) {
                  widgetSection = container.closest('#widget-section-' + instanceId);
                }
                if (!contentContainer) {
                  contentContainer = document.getElementById('widget-carousel-content-' + instanceId);
                }
                
                // Set up toggle functionality if header exists (closed by default)
                const header = widgetSection?.querySelector('.widget-carousel-header');
                if (header && contentContainer) {
                  const toggleIcon = header.querySelector('.widget-carousel-toggle');
                  let isExpanded = false;
                  contentContainer.style.display = 'none';
                  if (toggleIcon) {
                    toggleIcon.textContent = '▶';
                    toggleIcon.style.transform = 'rotate(-90deg)';
                  }
                  
                  header.addEventListener('click', () => {
                    isExpanded = !isExpanded;
                    contentContainer.style.display = isExpanded ? 'block' : 'none';
                    if (toggleIcon) {
                      toggleIcon.textContent = isExpanded ? '▼' : '▶';
                      toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
                    }
                  });
                }
              }
              
              // Check if container already has content to prevent duplicates
              if (container.children.length > 0) {
                console.log('[Widget] Timer container already has content, skipping initialization for', instanceId);
                return;
              }
              
              instance.element = container;
              instance.section = widgetSection;
              
              // Config is already the nested config object when passed from initWidget
              const configData = (config && config.config) ? config.config : (config || {});
              instance.config = configData;
              
              console.log('[Widget] initTimer - extracted configData:', {
                hideControls: configData.hideControls,
                hasHideControls: configData.hasOwnProperty('hideControls'),
                allKeys: Object.keys(configData)
              });
              
              instance.initialTime = configData.initialTime || configData.duration || configData.timeLimit || 60;
              instance.remainingTime = instance.initialTime;
              instance.direction = configData.direction || 'countdown';
              instance.format = configData.format || 'mm:ss';
              instance.showMilliseconds = configData.showMilliseconds || false;
              instance.onComplete = configData.onComplete || 'emit-event';
              instance.startOnLoad = configData.startOnLoad === true;
              instance.hideControls = configData.hideControls === true;
              
              console.log('[Widget] initTimer - final instance values:', {
                startOnLoad: instance.startOnLoad,
                hideControls: instance.hideControls,
                hideControlsSource: configData.hideControls,
                initialTime: instance.initialTime,
                direction: instance.direction
              });
              
              instance.isRunning = false;
              instance.intervalId = null;
              
              // Create display element
              const display = document.createElement('div');
              display.style.fontSize = '32px';
              display.style.fontFamily = 'monospace';
              display.style.fontWeight = 'bold';
              display.style.color = '#00d4ff';
              display.style.padding = '20px';
              display.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
              display.style.border = '2px solid rgba(0, 212, 255, 0.3)';
              display.style.borderRadius = '8px';
              display.style.margin = '10px 0';
              display.textContent = this._formatTime(instance.remainingTime, instance.format, instance.showMilliseconds);
              container.appendChild(display);
              instance.display = display;
              
              // Create control buttons (only if not hidden)
              if (!instance.hideControls) {
                const controlsContainer = document.createElement('div');
                controlsContainer.style.display = 'flex';
                controlsContainer.style.gap = '10px';
                controlsContainer.style.justifyContent = 'center';
                controlsContainer.style.marginTop = '15px';
                
                const self = this;
                const startBtn = document.createElement('button');
                startBtn.textContent = '▶ Start';
                startBtn.style.padding = '10px 20px';
                startBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.2)';
                startBtn.style.border = '2px solid #00d4ff';
                startBtn.style.borderRadius = '6px';
                startBtn.style.color = '#00d4ff';
                startBtn.style.cursor = 'pointer';
                startBtn.style.fontSize = '14px';
                startBtn.style.fontWeight = '600';
                startBtn.onclick = () => instance.timerStart();
                controlsContainer.appendChild(startBtn);
                
                const stopBtn = document.createElement('button');
                stopBtn.textContent = '⏸ Stop';
                stopBtn.style.padding = '10px 20px';
                stopBtn.style.backgroundColor = 'rgba(255, 100, 100, 0.2)';
                stopBtn.style.border = '2px solid #ff6464';
                stopBtn.style.borderRadius = '6px';
                stopBtn.style.color = '#ff6464';
                stopBtn.style.cursor = 'pointer';
                stopBtn.style.fontSize = '14px';
                stopBtn.style.fontWeight = '600';
                stopBtn.onclick = () => instance.timerStop();
                controlsContainer.appendChild(stopBtn);
                
                const resetBtn = document.createElement('button');
                resetBtn.textContent = '↻ Reset';
                resetBtn.style.padding = '10px 20px';
                resetBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                resetBtn.style.border = '2px solid rgba(255, 255, 255, 0.3)';
                resetBtn.style.borderRadius = '6px';
                resetBtn.style.color = '#ffffff';
                resetBtn.style.cursor = 'pointer';
                resetBtn.style.fontSize = '14px';
                resetBtn.style.fontWeight = '600';
                resetBtn.onclick = () => instance.timerReset();
                controlsContainer.appendChild(resetBtn);
                
                container.appendChild(controlsContainer);
                instance.controlsContainer = controlsContainer;
              }
              
              // Start timer on load if configured
              if (instance.startOnLoad) {
                setTimeout(() => {
                  instance.timerStart();
                }, 100);
              }
              
              // Store methods in instance
              const self = this;
              instance.timerStart = () => {
                if (instance.isRunning) return;
                instance.isRunning = true;
                instance.intervalId = setInterval(() => {
                  if (instance.direction === 'countdown') {
                    instance.remainingTime--;
                    if (instance.remainingTime <= 0) {
                      instance.timerStop();
                      self._handleTimerComplete(instanceId);
                    }
                  } else {
                    instance.remainingTime++;
                  }
                  instance.display.textContent = self._formatTime(instance.remainingTime, instance.format, instance.showMilliseconds);
                }, instance.showMilliseconds ? 10 : 1000);
              };
              
              instance.timerStop = () => {
                if (instance.intervalId) {
                  clearInterval(instance.intervalId);
                  instance.intervalId = null;
                }
                instance.isRunning = false;
              };
              
              instance.timerReset = () => {
                instance.timerStop();
                instance.remainingTime = instance.initialTime;
                instance.display.textContent = self._formatTime(instance.remainingTime, instance.format, instance.showMilliseconds);
              };
            },
            _handleTimerComplete: function(instanceId) {
              const instance = this._widgetInstances.get(instanceId);
              if (!instance) return;
              
              if (instance.onComplete === 'emit-event') {
                sendMessage("ai-sdk-emit-event", { event: { type: 'timer-complete', instanceId }, processedContentId: null });
              } else if (instance.onComplete === 'show-message') {
                sendMessage("ai-sdk-show-snack", { content: 'Timer completed!', duration: 3000, hideFromChatUI: false });
              }
            },
            _formatTime: function(seconds, format, showMilliseconds) {
              const hours = Math.floor(seconds / 3600);
              const minutes = Math.floor((seconds % 3600) / 60);
              const secs = Math.floor(seconds % 60);
              
              if (format === 'hh:mm:ss') {
                return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
              } else if (format === 'mm:ss') {
                return String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
              } else {
                return String(seconds);
              }
            },
            // Widget API Methods
            initWidget: function(widgetType, instanceId, config) {
              console.log('[Widget] Initializing widget:', widgetType, instanceId);
              this._widgetInstances.set(instanceId, { type: widgetType, config, element: null });
              
              // Initialize widget based on type
              if (widgetType === 'image-carousel') {
                this._initImageCarousel(instanceId, config);
              } else if (widgetType === 'timer') {
                this._initTimer(instanceId, config);
              } else {
                console.warn('[Widget] Unknown widget type:', widgetType);
              }
            },
            initImageCarousel: function(config) {
              // Backward compatibility wrapper - extract instanceId from config
              const instanceId = config?.instanceId;
              if (!instanceId) {
                console.error('[Widget] ❌ Image Carousel: instanceId is required.');
                return;
              }
              this._widgetInstances.set(instanceId, { type: 'image-carousel', config, element: null });
              this._initImageCarousel(instanceId, config);
            },
            initTimer: function(config) {
              // Backward compatibility wrapper - extract instanceId from config
              const instanceId = config?.instanceId;
              if (!instanceId) {
                console.error('[Widget] ❌ Timer: instanceId is required.');
                return;
              }
              this._widgetInstances.set(instanceId, { type: 'timer', config, element: null });
              this._initTimer(instanceId, config);
            },
            getLessonImages: (lessonId, callback) => {
              sendMessage("ai-sdk-get-lesson-images", { lessonId }, (response) => {
                if (callback) callback(response.images || [], response.error);
              });
            },
            getLessonImageIds: (lessonId, callback) => {
              sendMessage("ai-sdk-get-lesson-image-ids", { lessonId }, (response) => {
                if (callback) callback(response.imageIds || [], response.error);
              });
            },
            deleteImage: (imageId, callback) => {
              sendMessage("ai-sdk-delete-image", { imageId }, (response) => {
                if (callback) callback(response.success, response.error);
              });
            }
          };
        };
        
        // CRITICAL: Create window.aiSDK IMMEDIATELY with widget methods
        // This ensures widget methods are available before any interaction code runs
        const newSDK = window.createIframeAISDK();
        if (!window.aiSDK) {
          // SDK doesn't exist yet - create it with widget methods
          window.aiSDK = newSDK;
          console.log("[Interaction] ✅ Created window.aiSDK with widget methods");
        } else if (typeof window.aiSDK === 'object') {
          // SDK already exists - merge widget methods into it
          console.log("[Interaction] ⚠️ Preserving existing SDK methods:", Object.keys(window.aiSDK));
          // CRITICAL: Merge ALL widget methods and internal methods into existing SDK
          // This ensures _initImageCarousel, _initTimer, etc. are also available
          // Use proper binding instead of Object.assign to ensure 'this' context is correct
          const existingInstances = window.aiSDK._widgetInstances;
          const existingLessonId = window.aiSDK._currentLessonId;
          const existingAccountId = window.aiSDK._currentAccountId;
          
          // Copy all widget-related methods and internal methods from newSDK
          Object.keys(newSDK).forEach(key => {
            if (key.startsWith('_') || key === 'initWidget' || key === 'initImageCarousel' || key === 'initTimer' || 
                key === 'getLessonImages' || key === 'getLessonImageIds' || key === 'deleteImage' ||
                key === 'isReady' || key === 'completeInteraction') {
              if (typeof newSDK[key] === 'function') {
                window.aiSDK[key] = newSDK[key].bind(window.aiSDK);
              } else {
                window.aiSDK[key] = newSDK[key];
              }
            }
          });
          
          // Restore preserved values
          if (existingInstances) window.aiSDK._widgetInstances = existingInstances;
          if (existingLessonId) window.aiSDK._currentLessonId = existingLessonId;
          if (existingAccountId) window.aiSDK._currentAccountId = existingAccountId;
          
          console.log("[Interaction] ✅ Widget methods merged into existing SDK:", {
            hasInitWidget: !!window.aiSDK.initWidget,
            hasInitImageCarousel: !!window.aiSDK.initImageCarousel,
            hasInitTimer: !!window.aiSDK.initTimer
          });
        }
        console.log("[Interaction] ✅ SDK initialized for widgets");
        console.log("[Interaction] 🔍 SDK methods:", Object.keys(window.aiSDK));
      } else {
        // createIframeAISDK already exists - ensure widget methods are added
        const existingSDK = window.createIframeAISDK();
        // Preserve existing window.aiSDK if it exists
        if (window.aiSDK && typeof window.aiSDK === 'object') {
          console.log("[Interaction] ⚠️ Preserving existing SDK methods:", Object.keys(window.aiSDK));
          // CRITICAL: Merge ALL widget methods and internal methods into existing SDK
          // Use proper binding instead of Object.assign to ensure 'this' context is correct
          const existingInstances = window.aiSDK._widgetInstances;
          const existingLessonId = window.aiSDK._currentLessonId;
          const existingAccountId = window.aiSDK._currentAccountId;
          
          // Copy all widget-related methods and internal methods from existingSDK
          Object.keys(existingSDK).forEach(key => {
            if (key.startsWith('_') || key === 'initWidget' || key === 'initImageCarousel' || key === 'initTimer' || 
                key === 'getLessonImages' || key === 'getLessonImageIds' || key === 'deleteImage' ||
                key === 'isReady' || key === 'completeInteraction') {
              if (typeof existingSDK[key] === 'function') {
                window.aiSDK[key] = existingSDK[key].bind(window.aiSDK);
              } else {
                window.aiSDK[key] = existingSDK[key];
              }
            }
          });
          
          // Restore preserved values
          if (existingInstances) window.aiSDK._widgetInstances = existingInstances;
          if (existingLessonId) window.aiSDK._currentLessonId = existingLessonId;
          if (existingAccountId) window.aiSDK._currentAccountId = existingAccountId;
          
          console.log("[Interaction] ✅ Widget methods merged into existing SDK:", {
            hasInitWidget: !!window.aiSDK.initWidget,
            hasInitImageCarousel: !!window.aiSDK.initImageCarousel,
            hasInitTimer: !!window.aiSDK.initTimer
          });
        } else {
          window.aiSDK = existingSDK;
        }
        console.log("[Interaction] ✅ SDK initialized from existing createIframeAISDK");
        console.log("[Interaction] 🔍 SDK methods:", Object.keys(window.aiSDK));
      }
      
      // Listen for SDK ready message to store lesson ID and account ID, and initialize widgets
      window.addEventListener("message", (event) => {
        if (event.data.type === "ai-sdk-ready") {
          if (event.data.lessonId && window.aiSDK && window.aiSDK._currentLessonId !== undefined) {
            window.aiSDK._currentLessonId = event.data.lessonId;
            console.log("[Widget] SDK ready, lesson ID:", event.data.lessonId);
          }
          if (event.data.accountId && window.aiSDK && window.aiSDK._currentAccountId !== undefined) {
            window.aiSDK._currentAccountId = event.data.accountId;
            console.log("[Widget] SDK ready, account ID:", event.data.accountId);
          }
          
          // CRITICAL: Ensure widget methods are present IMMEDIATELY (not in setTimeout)
          // Widget code might run before setTimeout executes, so we need to merge methods now
          if (window.createIframeAISDK && typeof window.createIframeAISDK === 'function') {
            const widgetSDK = window.createIframeAISDK();
            if (window.aiSDK && typeof window.aiSDK === 'object') {
              // Merge widget methods into existing SDK if missing
              if (!window.aiSDK.initWidget || !window.aiSDK.initImageCarousel || !window.aiSDK.initTimer) {
                console.log('[Widget] 🔧 Adding missing widget methods to aiSDK immediately');
                // Preserve existing instances and IDs
                const existingInstances = window.aiSDK._widgetInstances;
                const existingLessonId = window.aiSDK._currentLessonId;
                const existingAccountId = window.aiSDK._currentAccountId;
                // Copy all widget-related methods and internal methods from widgetSDK
                // This ensures _initImageCarousel, _initTimer, etc. are also available
                Object.keys(widgetSDK).forEach(key => {
                  if (key.startsWith('_') || key === 'initWidget' || key === 'initImageCarousel' || key === 'initTimer' || 
                      key === 'getLessonImages' || key === 'getLessonImageIds' || key === 'deleteImage') {
                    if (typeof widgetSDK[key] === 'function') {
                      window.aiSDK[key] = widgetSDK[key].bind(window.aiSDK);
                    } else {
                      window.aiSDK[key] = widgetSDK[key];
                    }
                  }
                });
                // Restore preserved values
                if (existingInstances) window.aiSDK._widgetInstances = existingInstances;
                if (existingLessonId) window.aiSDK._currentLessonId = existingLessonId;
                if (existingAccountId) window.aiSDK._currentAccountId = existingAccountId;
                console.log('[Widget] ✅ Widget methods ensured on aiSDK');
              }
            } else if (!window.aiSDK) {
              // SDK doesn't exist, create it with widget methods
              console.log('[Widget] 🔧 Creating aiSDK with widget methods');
              window.aiSDK = widgetSDK;
            }
          }
          
          // Initialize widgets if widgetConfigs are available in interactionConfig
          setTimeout(() => {
            console.log('[Widget] 🔍 Checking widget initialization requirements...');
            console.log('[Widget] window.interactionConfig:', window.interactionConfig);
            console.log('[Widget] window.interactionConfig?.widgetConfigs:', window.interactionConfig?.widgetConfigs);
            console.log('[Widget] window.aiSDK:', window.aiSDK);
            console.log('[Widget] window.aiSDK?.initWidget:', window.aiSDK?.initWidget);
            
            if (window.interactionConfig && window.interactionConfig.widgetConfigs && window.aiSDK && window.aiSDK.initWidget) {
              const widgetConfigs = window.interactionConfig.widgetConfigs;
              console.log('[Widget] ✅ Initializing widgets from config:', widgetConfigs);
              
              Object.keys(widgetConfigs).forEach(instanceId => {
                const widgetConfig = widgetConfigs[instanceId];
                console.log('[Widget] 🔍 Processing widget config for', instanceId, ':', widgetConfig);
                // Widget config should include type and merged config
                if (widgetConfig.type && widgetConfig.config) {
                  console.log('[Widget] ✅ Initializing widget:', widgetConfig.type, instanceId, 'with config:', widgetConfig.config);
                  window.aiSDK.initWidget(widgetConfig.type, instanceId, widgetConfig.config);
                } else {
                  console.warn('[Widget] ⚠️ Widget config missing type or config:', widgetConfig);
                }
              });
            } else {
              console.warn('[Widget] ⚠️ Widget initialization skipped - missing requirements:', {
                hasInteractionConfig: !!window.interactionConfig,
                hasWidgetConfigs: !!(window.interactionConfig && window.interactionConfig.widgetConfigs),
                hasAiSDK: !!window.aiSDK,
                hasInitWidget: !!(window.aiSDK && window.aiSDK.initWidget)
              });
            }
          }, 100);
        }
      });
    })();
  </script>
  <script type="text/javascript">
    try {
      if (!window.interactionData) {
        console.error("[Interaction] ERROR: window.interactionData is not set!");
        document.body.innerHTML = '<div style="padding: 20px; color: red;"><h3>Error: Interaction data not available</h3></div>';
      } else {
        console.log("[Interaction] About to run JS code");
        try {
          // Read the JavaScript code from the text/plain script tag
          const jsCodeScript = document.getElementById('interaction-js-code');
          if (!jsCodeScript) {
            throw new Error('JavaScript code script tag not found');
          }
          // Decode from base64 if available, otherwise read as text
          // Use UTF-8 safe decoding to handle Unicode characters
          let jsCode = '';
          if (jsCodeScript.dataset.base64) {
            try {
              // Decode base64 and then decode from UTF-8 to handle Unicode characters
              // This reverses: btoa(unescape(encodeURIComponent(normalizedJs)))
              jsCode = decodeURIComponent(escape(atob(jsCodeScript.dataset.base64)));
              console.log('[Interaction] ✅ Decoded base64 JavaScript code (UTF-8 safe), length:', jsCode.length);
            } catch (e) {
              console.error('[Interaction] Error decoding base64 JavaScript code:', e);
              jsCode = jsCodeScript.textContent || jsCodeScript.innerHTML || '';
            }
          } else {
            jsCode = jsCodeScript.textContent || jsCodeScript.innerHTML || '';
            console.log('[Interaction] Read JavaScript code as text, length:', jsCode.length);
          }
          if (!jsCode.trim()) {
            console.warn("[Interaction] No JavaScript code to execute");
            // Don't return - just skip execution
          } else {
            // Execute the code by directly creating a script element with textContent
            // This is the most reliable way to execute code that may contain return statements in IIFEs
            // The browser will execute it in the proper script context
            try {
              console.log('[Interaction] Creating script element and executing code...');
              const scriptEl = document.createElement('script');
              // Set textContent directly - this will execute when appended to the DOM
              scriptEl.textContent = jsCode;
              // CRITICAL: Ensure widget methods are present BEFORE script executes
              // Widget code in the script might check for methods immediately
              if (window.createIframeAISDK && typeof window.createIframeAISDK === 'function') {
                const widgetSDK = window.createIframeAISDK();
                // ALWAYS ensure window.aiSDK exists with widget methods before script runs
                if (!window.aiSDK) {
                  // SDK doesn't exist, create it with widget methods
                  console.log('[Interaction] 🔧 Creating aiSDK with widget methods before script execution');
                  window.aiSDK = widgetSDK;
                } else if (typeof window.aiSDK === 'object') {
                  // SDK exists - ALWAYS merge widget methods (don't check if missing, just merge)
                  console.log('[Interaction] 🔧 Ensuring widget methods on aiSDK BEFORE script execution');
                  // Preserve existing instances and IDs
                  const existingInstances = window.aiSDK._widgetInstances;
                  const existingLessonId = window.aiSDK._currentLessonId;
                  const existingAccountId = window.aiSDK._currentAccountId;
                  // Copy all widget-related methods and internal methods from widgetSDK
                  Object.keys(widgetSDK).forEach(key => {
                    if (key.startsWith('_') || key === 'initWidget' || key === 'initImageCarousel' || key === 'initTimer' || 
                        key === 'getLessonImages' || key === 'getLessonImageIds' || key === 'deleteImage') {
                      if (typeof widgetSDK[key] === 'function') {
                        window.aiSDK[key] = widgetSDK[key].bind(window.aiSDK);
                      } else {
                        window.aiSDK[key] = widgetSDK[key];
                      }
                    }
                  });
                  // Restore preserved values
                  if (existingInstances) window.aiSDK._widgetInstances = existingInstances;
                  if (existingLessonId) window.aiSDK._currentLessonId = existingLessonId;
                  if (existingAccountId) window.aiSDK._currentAccountId = existingAccountId;
                  console.log('[Interaction] ✅ Widget methods ensured on aiSDK before script execution:', {
                    hasInitWidget: !!window.aiSDK.initWidget,
                    hasInitImageCarousel: !!window.aiSDK.initImageCarousel,
                    hasInitTimer: !!window.aiSDK.initTimer
                  });
                }
              }
              
              // Append to head - script executes immediately
              document.head.appendChild(scriptEl);
              console.log('[Interaction] ✅ Script element appended and executed');
              // Remove the script element after execution to keep DOM clean
              // Use a small delay to ensure execution completes
              setTimeout(() => {
                try {
                  if (scriptEl.parentNode) {
                    scriptEl.parentNode.removeChild(scriptEl);
                    console.log('[Interaction] ✅ Script element removed from DOM');
                  }
                } catch (removeError) {
                  // Ignore errors when removing - script may have already been removed
                  console.warn("[Interaction] Could not remove script element:", removeError);
                }
                
                // CRITICAL: Ensure widget methods are still present after script execution
                // The interaction's JS code may have overwritten window.aiSDK
                if (window.createIframeAISDK && typeof window.createIframeAISDK === 'function') {
                  const widgetSDK = window.createIframeAISDK();
                  if (window.aiSDK && typeof window.aiSDK === 'object') {
                    // Merge widget methods into existing SDK if missing
                    if (!window.aiSDK.initWidget || !window.aiSDK.initImageCarousel || !window.aiSDK.initTimer) {
                      console.log('[Interaction] 🔧 Re-adding missing widget methods to aiSDK after script execution');
                      // Preserve existing instances and IDs
                      const existingInstances = window.aiSDK._widgetInstances;
                      const existingLessonId = window.aiSDK._currentLessonId;
                      const existingAccountId = window.aiSDK._currentAccountId;
                      // Copy all widget-related methods and internal methods from widgetSDK
                      Object.keys(widgetSDK).forEach(key => {
                        if (key.startsWith('_') || key === 'initWidget' || key === 'initImageCarousel' || key === 'initTimer' || 
                            key === 'getLessonImages' || key === 'getLessonImageIds' || key === 'deleteImage') {
                          if (typeof widgetSDK[key] === 'function') {
                            window.aiSDK[key] = widgetSDK[key].bind(window.aiSDK);
                          } else {
                            window.aiSDK[key] = widgetSDK[key];
                          }
                        }
                      });
                      // Restore preserved values
                      if (existingInstances) window.aiSDK._widgetInstances = existingInstances;
                      if (existingLessonId) window.aiSDK._currentLessonId = existingLessonId;
                      if (existingAccountId) window.aiSDK._currentAccountId = existingAccountId;
                      console.log('[Interaction] ✅ Widget methods re-added to aiSDK after script execution');
                    }
                  } else if (!window.aiSDK) {
                    // SDK doesn't exist, create it with widget methods
                    console.log('[Interaction] 🔧 Re-creating aiSDK with widget methods after script execution');
                    window.aiSDK = widgetSDK;
                  }
                }
              }, 100);
            } catch (error) {
              console.error("[Interaction] Error executing JS code:", error);
              // Don't throw - allow the interaction to continue even if JS execution fails
              // The error will be visible in console for debugging
            }
          }
        } catch (e) {
          console.error("[Interaction] Error executing JS code:", e);
          throw e;
        }
      }
    } catch (e) {
      console.error("[Interaction] Error in script:", e);
      var errorDiv = document.createElement("div");
      errorDiv.style.cssText = "padding: 20px; color: red; background: #1a1a1a; border: 2px solid red; margin: 20px;";
      errorDiv.innerHTML = "<h3>Error in interaction code:</h3><pre style=\\"white-space: pre-wrap;\\">" + e.name + ": " + e.message + "\\n\\n" + (e.stack || "") + "</pre>";
      document.body.appendChild(errorDiv);
    }
  </script>
</body>
</html>`;
  }

  /**
   * Play a teacher script block
   */
  /**
   * Get overlay mode for iFrame interactions
   */
  getIframeOverlayMode(): 'overlay' | 'section' {
    if (!this.interactionBuild || this.interactionBuild.interactionTypeCategory !== 'iframe') {
      return 'overlay'; // Default
    }
    return this.interactionBuild.iframeConfig?.overlayMode || 'overlay';
  }

  /**
   * Get sanitized HTML for iFrame overlay
   */
  getSanitizedIframeOverlayHtml(): any {
    if (!this.interactionBuild || this.interactionBuild.interactionTypeCategory !== 'iframe') {
      return '';
    }
    const html = this.interactionBuild.htmlCode || '';
    const css = this.interactionBuild.cssCode || '';
    const fullHtml = css ? `<style>${css}</style>${html}` : html;
    return this.sanitizer.bypassSecurityTrustHtml(fullHtml);
  }

  private iframeSectionScriptElement: HTMLScriptElement | null = null;
  private cachedIframeSectionHtml: any = null;
  private cachedIframeSectionHtmlKey: string | null = null;

  /**
   * Get sanitized HTML for iFrame section below
   */
  getSanitizedIframeSectionHtml(): any {
    if (!this.interactionBuild || this.interactionBuild.interactionTypeCategory !== 'iframe') {
      this.cachedIframeSectionHtml = null;
      this.cachedIframeSectionHtmlKey = null;
      return '';
    }
    
    // Create a cache key based on the interaction build content
    const cacheKey = `${this.interactionBuild.id || 'unknown'}-${this.interactionBuild.htmlCode?.substring(0, 50) || ''}-${this.interactionBuild.cssCode?.substring(0, 50) || ''}`;
    
    // Check if buttons already exist - if so, return cached HTML to prevent overwriting
    // This prevents Angular's change detection from clearing dynamically created buttons
    const sectionElement = document.querySelector('.interaction-section-below');
    if (sectionElement) {
      const buttonsContainer = sectionElement.querySelector('#sdk-test-buttons');
      if (buttonsContainer && buttonsContainer.children.length > 0) {
        // Buttons already exist, return cached HTML to prevent overwriting
        if (this.cachedIframeSectionHtml && this.cachedIframeSectionHtmlKey === cacheKey) {
          return this.cachedIframeSectionHtml;
        }
      }
    }
    
    // If cache key changed or no cache exists, regenerate
    if (this.cachedIframeSectionHtmlKey !== cacheKey) {
      const html = this.interactionBuild.htmlCode || '';
      const css = this.interactionBuild.cssCode || '';
      const js = this.interactionBuild.jsCode || '';
      
      // Check if this is an SDK test interaction (has initTestApp or sdk-test-buttons in JS)
      const isSDKTest = js && (js.includes('initTestApp') || js.includes('sdk-test-buttons') || js.includes('SDK Test'));
      
      let fullHtml = css ? `<style>${css}</style>` : '';
      
      // If it's an SDK test, ensure the required structure elements exist
      if (isSDKTest) {
        // Add SDK test structure if not already in HTML
        if (!html.includes('sdk-test-header') && !html.includes('sdk-test-buttons')) {
          fullHtml += `
            <div id="sdk-test-header">
              <h1>AI Teacher SDK Test</h1>
              <p id="status-text">Initializing...</p>
            </div>
            <div id="sdk-test-buttons"></div>
          `;
        }
      }
      
      fullHtml += html;
      
      // Cache the sanitized HTML
      this.cachedIframeSectionHtml = this.sanitizer.bypassSecurityTrustHtml(fullHtml);
      this.cachedIframeSectionHtmlKey = cacheKey;
    }
    
    // Don't include JS in innerHTML - we'll inject it separately after DOM is ready
    // The script will be injected by createInteractionBlobUrl() after the view is rendered
    // This ensures the section element exists in the DOM before we inject the script
    
    return this.cachedIframeSectionHtml;
  }

  /**
   * Inject JavaScript into the iframe section below (similar to media player overlay script injection)
   */
  private injectIframeSectionScript(jsCode: string): void {
    // Remove existing script if any
    if (this.iframeSectionScriptElement) {
      this.iframeSectionScriptElement.remove();
      this.iframeSectionScriptElement = null;
    }

    // Retry logic to find section element and required elements
    const tryInject = (attempt: number = 1, maxAttempts: number = 10) => {
      const sectionElement = document.querySelector('.interaction-section-below');
      if (!sectionElement) {
        if (attempt < maxAttempts) {
          console.log(`[LessonView] ⏳ Section not found yet, retrying... (${attempt}/${maxAttempts})`);
          setTimeout(() => tryInject(attempt + 1, maxAttempts), 100 * attempt);
          return;
        } else {
          console.warn('[LessonView] ⚠️ Interaction section below not found after max attempts, cannot inject script');
          return;
        }
      }

      // Verify required elements exist
      const buttons = sectionElement.querySelector('#sdk-test-buttons');
      const status = sectionElement.querySelector('#status-text');
      if (!buttons || !status) {
        if (attempt < maxAttempts) {
          console.log(`[LessonView] ⏳ Required elements not found yet (buttons: ${!!buttons}, status: ${!!status}), retrying... (${attempt}/${maxAttempts})`);
          setTimeout(() => tryInject(attempt + 1, maxAttempts), 100 * attempt);
          return;
        } else {
          console.warn('[LessonView] ⚠️ Required elements (#sdk-test-buttons or #status-text) not found after max attempts');
          return;
        }
      }

      // Check if script was already injected successfully (buttons have children = script ran)
      if (buttons.children.length > 0) {
        console.log('[LessonView] ✅ Script already injected and executed (buttons exist)');
        return;
      }

      // Check if script element already exists
      if (this.iframeSectionScriptElement && sectionElement.contains(this.iframeSectionScriptElement)) {
        console.log('[LessonView] ⏳ Script element already exists, waiting for execution...');
        if (attempt < maxAttempts) {
          setTimeout(() => tryInject(attempt + 1, maxAttempts), 200);
          return;
        }
      }

      // For section mode, use the simpler version without overlay-specific elements
      // This is the clean version from sdk-test-iframe-document.html that doesn't reference overlay elements
      const wrappedScript = `
        (function() {
          let aiSDK = null;
          let statusText = null;
          let buttonsContainer = null;

          const createIframeAISDK = () => {
            let subscriptionId = null;
            let requestCounter = 0;

            const generateRequestId = () => \`req-\${Date.now()}-\${++requestCounter}\`;
            const generateSubscriptionId = () => \`sub-\${Date.now()}-\${Math.random()}\`;

            const sendMessage = (type, data, callback) => {
              const requestId = generateRequestId();
              const message = { type, requestId, ...data };

              if (callback) {
                const listener = (event) => {
                  if (event.data.requestId === requestId) {
                    window.removeEventListener("message", listener);
                    callback(event.data);
                  }
                };
                window.addEventListener("message", listener);
              }
              window.parent.postMessage(message, "*");
            };

            return {
              emitEvent: (event, processedContentId) => {
                sendMessage("ai-sdk-emit-event", { event, processedContentId });
              },
              updateState: (key, value) => {
                sendMessage("ai-sdk-update-state", { key, value });
              },
              getState: (callback) => {
                sendMessage("ai-sdk-get-state", {}, (response) => {
                  callback(response.state);
                });
              },
              onResponse: (callback) => {
                subscriptionId = generateSubscriptionId();
                sendMessage("ai-sdk-subscribe", { subscriptionId }, () => {
                  const listener = (event) => {
                    if (event.data.type === "ai-sdk-response" && event.data.subscriptionId === subscriptionId) {
                      callback(event.data.response);
                    }
                  };
                  window.addEventListener("message", listener);
                  return () => {
                    window.removeEventListener("message", listener);
                    sendMessage("ai-sdk-unsubscribe", { subscriptionId });
                  };
                });
              },
              isReady: (callback) => {
                const listener = (event) => {
                  if (event.data.type === "ai-sdk-ready") {
                    window.removeEventListener("message", listener);
                    callback(true);
                  }
                };
                window.addEventListener("message", listener);
              },
              minimizeChatUI: () => {
                sendMessage("ai-sdk-minimize-chat-ui", {});
              },
              showChatUI: () => {
                sendMessage("ai-sdk-show-chat-ui", {});
              },
              activateFullscreen: () => {
                sendMessage("ai-sdk-activate-fullscreen", {});
              },
              deactivateFullscreen: () => {
                sendMessage("ai-sdk-deactivate-fullscreen", {});
              },
              postToChat: (content, role, showInWidget) => {
                sendMessage("ai-sdk-post-to-chat", { content, role, showInWidget });
              },
              showScript: (script, autoPlay) => {
                sendMessage("ai-sdk-show-script", { script, autoPlay });
              },
              showSnack: (content, duration, hideFromChatUI, callback) => {
                sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false }, (response) => {
                  if (callback && response.snackId) {
                    callback(response.snackId);
                  }
                });
              },
              hideSnack: () => {
                sendMessage("ai-sdk-hide-snack", {});
              },
              saveInstanceData: (data, callback) => {
                sendMessage("ai-sdk-save-instance-data", { data }, (response) => {
                  if (callback) {
                    callback(response.success, response.error);
                  }
                });
              },
              getInstanceDataHistory: (filters, callback) => {
                sendMessage("ai-sdk-get-instance-data-history", { filters }, (response) => {
                  if (callback) {
                    callback(response.data, response.error);
                  }
                });
              },
              saveUserProgress: (data, callback) => {
                sendMessage("ai-sdk-save-user-progress", { data }, (response) => {
                  if (callback) {
                    callback(response.progress, response.error);
                  }
                });
              },
              getUserProgress: (callback) => {
                sendMessage("ai-sdk-get-user-progress", {}, (response) => {
                  if (callback) {
                    callback(response.progress, response.error);
                  }
                });
              },
              markCompleted: (callback) => {
                sendMessage("ai-sdk-mark-completed", {}, (response) => {
                  if (callback) {
                    callback(response.progress, response.error);
                  }
                });
              },
              incrementAttempts: (callback) => {
                sendMessage("ai-sdk-increment-attempts", {}, (response) => {
                  if (callback) {
                    callback(response.progress, response.error);
                  }
                });
              },
              getUserPublicProfile: (userId, callback) => {
                sendMessage("ai-sdk-get-user-public-profile", { userId }, (response) => {
                  if (callback) {
                    callback(response.profile, response.error);
                  }
                });
              },
            };
          };

          function updateStatus(message, color = "#ffffff") {
            if (statusText) {
              statusText.textContent = message;
              statusText.style.color = color;
            }
            console.log("[SDK Test iFrame]", message);
          }

          function createButton(text, onClick) {
            const button = document.createElement("button");
            button.className = "test-button";
            button.textContent = text;
            button.onclick = onClick;
            // Always try to get the container directly to avoid closure issues
            const container = buttonsContainer || document.getElementById("sdk-test-buttons");
            if (container) {
              container.appendChild(button);
              console.log("[SDK Test iFrame] ✅ Button appended:", text, "Container children:", container.children.length);
            } else {
              console.error("[SDK Test iFrame] ❌ Cannot append button - container not found!", text);
            }
            return button;
          }

          function initTestApp() {
            console.log("[SDK Test iFrame] Initializing app...");
            
            // Verify elements are set (they should be set by checkAndRun)
            if (!buttonsContainer || !statusText) {
              console.error("[SDK Test iFrame] Required elements not found!", { container: !!buttonsContainer, status: !!statusText });
              // Try to re-fetch as fallback
              buttonsContainer = document.getElementById("sdk-test-buttons");
              statusText = document.getElementById("status-text");
              if (!buttonsContainer || !statusText) {
                console.error("[SDK Test iFrame] Still not found after re-fetch!");
                return;
              }
            }

            aiSDK = createIframeAISDK();
            
            const isPreviewMode = !window.parent || window.parent === window;
            
            if (isPreviewMode) {
              updateStatus("Preview Mode - SDK will work when added to a lesson", "#ffff00");
            } else {
              updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", "#ffff00");
              
              aiSDK.isReady((ready) => {
                if (ready) {
                  updateStatus("SDK Ready! All methods available.", "#00ff00");
                }
              });
            }

            const coreLabel = document.createElement("div");
            coreLabel.className = "section-label";
            coreLabel.textContent = "CORE METHODS";
            buttonsContainer.appendChild(coreLabel);

            createButton("Emit Event", () => {
              aiSDK.emitEvent({
                type: "user-selection",
                data: { test: true, timestamp: Date.now() },
                requiresLLMResponse: true,
              });
              updateStatus("Event emitted", "#00ff00");
            });

            createButton("Update State", () => {
              aiSDK.updateState("testKey", { value: Math.random(), timestamp: Date.now() });
              updateStatus("State updated", "#00ff00");
            });

            createButton("Get State", () => {
              aiSDK.getState((state) => {
                updateStatus("State: " + JSON.stringify(state).substring(0, 50), "#00ff00");
              });
            });

            const uiLabel = document.createElement("div");
            uiLabel.className = "section-label";
            uiLabel.textContent = "UI CONTROL METHODS";
            buttonsContainer.appendChild(uiLabel);

            createButton("Minimize Chat UI", () => {
              aiSDK.minimizeChatUI();
              updateStatus("Chat UI minimized", "#00ff00");
            });

            createButton("Show Chat UI", () => {
              aiSDK.showChatUI();
              updateStatus("Chat UI shown", "#00ff00");
            });

            createButton("Activate Fullscreen", () => {
              aiSDK.activateFullscreen();
              updateStatus("Fullscreen activated", "#00ff00");
            });

            createButton("Deactivate Fullscreen", () => {
              aiSDK.deactivateFullscreen();
              updateStatus("Fullscreen deactivated", "#00ff00");
            });

            createButton("Post to Chat", () => {
              const testMessage = "Test message from SDK Test interaction! This is a dummy message to test the postToChat functionality.";
              aiSDK.postToChat(testMessage, "assistant", true);
              updateStatus("Posted to chat: " + testMessage.substring(0, 30) + "...", "#00ff00");
            });

            createButton("Show Script", () => {
              const testScript = "This is a test script block from the SDK Test interaction. It demonstrates the showScript functionality.";
              aiSDK.showScript(testScript, true);
              updateStatus("Script shown: " + testScript.substring(0, 30) + "...", "#00ff00");
            });

            createButton("Show Snack (5s)", () => {
              aiSDK.showSnack("Test snack message! (also posts to chat)", 5000, false, (snackId) => {
                updateStatus("Snack shown: " + snackId, "#00ff00");
              });
            });

            createButton("Show Snack (no chat)", () => {
              aiSDK.showSnack("Test snack message! (hidden from chat)", 5000, true, (snackId) => {
                updateStatus("Snack shown (no chat): " + snackId, "#00ff00");
              });
            });

            createButton("Hide Snack", () => {
              aiSDK.hideSnack();
              updateStatus("Snack hidden", "#00ff00");
            });

            const dataLabel = document.createElement("div");
            dataLabel.className = "section-label";
            dataLabel.textContent = "DATA STORAGE METHODS";
            buttonsContainer.appendChild(dataLabel);

            createButton("Save Instance Data", () => {
              aiSDK.saveInstanceData(
                {
                  testValue: Math.random(),
                  timestamp: Date.now(),
                  testArray: [1, 2, 3],
                },
                (success, error) => {
                  if (success) {
                    updateStatus("Instance data saved", "#00ff00");
                  } else {
                    updateStatus("Error: " + error, "#ff0000");
                  }
                }
              );
            });

            createButton("Get Instance Data History", () => {
              aiSDK.getInstanceDataHistory(
                { limit: 10 },
                (data, error) => {
                  if (data) {
                    updateStatus("History: " + data.length + " records", "#00ff00");
                  } else {
                    updateStatus("Error: " + error, "#ff0000");
                  }
                }
              );
            });

            createButton("Save User Progress", () => {
              aiSDK.saveUserProgress(
                {
                  score: Math.floor(Math.random() * 100),
                  completed: false,
                  customData: {
                    testField: "test value",
                    testNumber: 42,
                  },
                },
                (progress, error) => {
                  if (progress) {
                    updateStatus("Progress saved. Attempts: " + progress.attempts, "#00ff00");
                  } else {
                    updateStatus("Error: " + error, "#ff0000");
                  }
                }
              );
            });

            createButton("Get User Progress", () => {
              aiSDK.getUserProgress((progress, error) => {
                if (progress) {
                  updateStatus(
                    "Progress: Attempts=" + progress.attempts + ", Completed=" + progress.completed,
                    "#00ff00"
                  );
                } else if (error) {
                  updateStatus("Error: " + error, "#ff0000");
                } else {
                  updateStatus("No progress found", "#ffff00");
                }
              });
            });

            createButton("Mark Completed", () => {
              aiSDK.markCompleted((progress, error) => {
                if (progress) {
                  updateStatus("Marked as completed", "#00ff00");
                } else {
                  updateStatus("Error: " + error, "#ff0000");
                }
              });
            });

            createButton("Increment Attempts", () => {
              aiSDK.incrementAttempts((progress, error) => {
                if (progress) {
                  updateStatus("Attempts: " + progress.attempts, "#00ff00");
                } else {
                  updateStatus("Error: " + error, "#ff0000");
                }
              });
            });

            createButton("Get User Public Profile", () => {
              aiSDK.getUserPublicProfile(undefined, (profile, error) => {
                if (profile) {
                  updateStatus("Profile: " + (profile.displayName || "No name"), "#00ff00");
                } else if (error) {
                  updateStatus("Error: " + error, "#ff0000");
                } else {
                  updateStatus("No profile found (this is OK)", "#ffff00");
                }
              });
            });

            console.log("[SDK Test iFrame] All buttons created");
          }
          
          // Wait for elements and then initialize
          const checkAndRun = () => {
            const container = document.getElementById("sdk-test-buttons");
            const status = document.getElementById("status-text");
            
            if (!container || !status) {
              console.log('[LessonView] ⏳ Waiting for elements...', { buttons: !!container, status: !!status });
              setTimeout(checkAndRun, 50);
              return;
            }
            
            // Assign to outer scope variables BEFORE calling initTestApp
            buttonsContainer = container;
            statusText = status;
            
            console.log('[LessonView] ✅ Elements found, initializing app');
            initTestApp();
          };
          
          // Start checking immediately
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkAndRun);
          } else {
            checkAndRun();
          }
        })();
      `;
      
      // Create new script element
      this.iframeSectionScriptElement = document.createElement('script');
      this.iframeSectionScriptElement.textContent = wrappedScript;
      
      // Append to section element
      sectionElement.appendChild(this.iframeSectionScriptElement);
      console.log('[LessonView] ✅ Injected script into iframe section below');
      console.log('[LessonView] 🔍 Buttons container exists:', !!buttons, 'Status text exists:', !!status);
      
      // Check if buttons were created after a delay
      setTimeout(() => {
        if (buttons.children.length === 0) {
          console.warn('[LessonView] ⚠️ Script injected but buttons not created after 1s - script may have errors');
        } else {
          console.log('[LessonView] ✅ Buttons created successfully:', buttons.children.length);
        }
      }, 1000);
    };

    // Start injection attempt
    tryInject();
  }

  /**
   * Get sanitized HTML for media player section below
   */
  // Cache for sanitized section HTML to prevent re-rendering after initialization
  private cachedVideoUrlSectionHtml: any = null;

  getSanitizedSectionHtml(html?: string, css?: string): any {
    if (!html && !css) {
      return '';
    }
    const fullHtml = css ? `<style>${css}</style>${html || ''}` : (html || '');
    
    // Check if this section has been initialized (buttons created) - if so, return cached HTML
    const sectionContainer = this.videoUrlSectionContainerRef?.nativeElement;
    if (sectionContainer) {
      const innerHtmlDiv = sectionContainer.querySelector('div') || sectionContainer.firstElementChild;
      if (innerHtmlDiv && (innerHtmlDiv as any).__initialized) {
        // Section already initialized, return cached HTML to prevent re-rendering
        // This preserves onclick handlers which are lost if we return innerHTML
        if (this.cachedVideoUrlSectionHtml) {
          console.log('[LessonView] 🔒 Preventing re-render of initialized section (using cache)');
          return this.cachedVideoUrlSectionHtml;
        }
      }
    }
    
    // Cache the sanitized HTML on first call
    const sanitized = this.sanitizer.bypassSecurityTrustHtml(fullHtml);
    if (sectionContainer) {
      const innerHtmlDiv = sectionContainer.querySelector('div') || sectionContainer.firstElementChild;
      if (innerHtmlDiv && !(innerHtmlDiv as any).__initialized) {
        // Only cache if not yet initialized (to avoid caching stale HTML)
        this.cachedVideoUrlSectionHtml = sanitized;
      }
    }
    
    return sanitized;
  }

  /**
   * Execute JavaScript code for video-url section content
   */
  private executeVideoUrlSectionJs() {
    if (!this.videoUrlPlayerData?.sectionJs) {
      return;
    }

    const sectionContainer = this.videoUrlSectionContainerRef?.nativeElement;
    if (!sectionContainer) {
      console.warn('[LessonView] ⚠️ Video URL section container not found');
      return;
    }
    
    // Wait for HTML to be rendered before injecting JS
    // Check if expected elements exist (like sdk-test-buttons or sdk-test-video-url-overlay)
    const waitForHtml = (retries = 0, maxRetries = 20) => {
      if (!sectionContainer) {
        console.warn('[LessonView] ⚠️ Section container is null, cannot wait for HTML');
        return;
      }
      
      const hasExpectedElements = sectionContainer.querySelector('#sdk-test-buttons') || 
                                  sectionContainer.querySelector('#sdk-test-video-url-overlay') ||
                                  sectionContainer.querySelector('[id*="sdk-test"]');
      
      if (!hasExpectedElements && this.videoUrlPlayerData?.sectionHtml && retries < maxRetries) {
        // HTML not rendered yet, retry after a short delay
        setTimeout(() => waitForHtml(retries + 1, maxRetries), 50);
        return;
      }
      
      if (retries >= maxRetries) {
        console.warn('[LessonView] ⚠️ HTML elements not found after waiting, proceeding anyway');
      }
      
      // HTML is rendered (or we've given up waiting), proceed with JS injection
      this.injectVideoUrlSectionJs();
    };
    
    waitForHtml();
  }
  
  private injectVideoUrlSectionJs() {
    // Run outside Angular's zone to prevent change detection from clearing dynamically added buttons
    this.ngZone.runOutsideAngular(() => {
      const sectionContainer = this.videoUrlSectionContainerRef?.nativeElement;
      if (!sectionContainer) {
        return;
      }
      
      if (!this.videoUrlPlayerData) {
        console.warn('[LessonView] ⚠️ Video URL player data is null');
        return;
      }

      // Remove any existing script element
      const existingScript = sectionContainer.querySelector('script.video-url-section-script');
      if (existingScript) {
        existingScript.remove();
      }

      // Create and inject SDK first, then the user's script
      const sdkScript = document.createElement('script');
      sdkScript.className = 'video-url-section-sdk';
      try {
        const sdkCode = this.createVideoUrlSectionSDK();
        sdkScript.textContent = sdkCode;
        sectionContainer.appendChild(sdkScript);
      } catch (error) {
        console.error('[LessonView] ❌ Error creating SDK script:', error);
        return;
      }
      
      // Create and inject user's script (only if it exists and is not empty)
      if (this.videoUrlPlayerData.sectionJs && this.videoUrlPlayerData.sectionJs.trim()) {
        const script = document.createElement('script');
        script.className = 'video-url-section-script';
        try {
          // Validate that the JavaScript code doesn't have obvious syntax errors
          const jsCode = this.videoUrlPlayerData.sectionJs.trim();
          
          // Log code info for debugging
          console.log('[LessonView] 📝 Injecting section JS, length:', jsCode.length);
          console.log('[LessonView] 📝 Section JS preview (first 500 chars):', jsCode.substring(0, 500));
          console.log('[LessonView] 📝 Section JS preview (last 500 chars):', jsCode.substring(Math.max(0, jsCode.length - 500)));
          
          // Check if code is suspiciously short (likely truncated)
          if (jsCode.length < 200) {
            console.warn('[LessonView] ⚠️ Section JS is suspiciously short (likely truncated). Expected ~5000+ chars for SDK test interactions.');
            console.warn('[LessonView] Code preview:', jsCode.substring(0, 200));
            console.warn('[LessonView] ⚠️ Skipping injection of truncated code. SDK will still be available.');
            // Don't inject truncated code - it will cause syntax errors
            // The SDK is already injected above, so buttons should still work
            return;
          }
          
          // Check for unclosed template literals (basic check)
          const backtickCount = (jsCode.match(/`/g) || []).length;
          const escapedBacktickCount = (jsCode.match(/\\`/g) || []).length;
          const unescapedBackticks = backtickCount - escapedBacktickCount;
          
          if (unescapedBackticks % 2 !== 0) {
            console.warn('[LessonView] ⚠️ Potential unclosed template literal in section JS');
            console.warn('[LessonView] Backtick count:', backtickCount, 'Escaped:', escapedBacktickCount);
          }
          
          // Try to parse the code as JavaScript to catch syntax errors early
          try {
            // This will throw if there's a syntax error
            new Function(jsCode);
          } catch (parseError) {
            console.error('[LessonView] ❌ JavaScript syntax error detected:', parseError);
            console.error('[LessonView] Code preview (first 500 chars):', jsCode.substring(0, 500));
            throw parseError; // Re-throw to be caught by outer try-catch
          }
          
          script.textContent = jsCode;
          sectionContainer.appendChild(script);
          console.log('[LessonView] ✅ Video URL section JS executed with SDK');
          
          // Immediately mark section as initialized to prevent re-rendering
          // This must happen BEFORE Angular's next change detection cycle
          const innerHtmlDiv = sectionContainer.querySelector('div') || sectionContainer.firstElementChild;
          if (innerHtmlDiv) {
            (innerHtmlDiv as any).__initialized = true;
            console.log('[LessonView] ✅ Section marked as initialized immediately');
          }
          
          // Use MutationObserver to detect when buttons are added and ensure they persist
          const buttonsContainer = document.getElementById('sdk-test-buttons');
          if (buttonsContainer) {
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                  console.log('[LessonView] ✅ Buttons detected being added:', mutation.addedNodes.length);
                  // Ensure the section stays initialized
                  if (innerHtmlDiv) {
                    (innerHtmlDiv as any).__initialized = true;
                  }
                }
              });
            });
            
            observer.observe(buttonsContainer, { childList: true, subtree: true });
            
            // Also check after a delay
            setTimeout(() => {
              if (buttonsContainer.children.length > 0) {
                console.log('[LessonView] ✅ Buttons found after injection:', buttonsContainer.children.length);
              } else {
                console.warn('[LessonView] ⚠️ Buttons not found after injection - may have been cleared by Angular');
              }
              observer.disconnect();
            }, 2000);
          }
        } catch (error) {
          console.error('[LessonView] ❌ Error injecting section JS:', error);
          console.error('[LessonView] Section JS length:', this.videoUrlPlayerData.sectionJs?.length);
          console.error('[LessonView] Section JS preview:', this.videoUrlPlayerData.sectionJs?.substring(0, 200));
          // Don't throw - just log the error and continue
          // The SDK is already injected above, so buttons should still work
        }
      } else {
        console.log('[LessonView] ✅ Video URL section JS executed with SDK (no custom JS)');
      }
    });
  }

  /**
   * Send SDK ready message to video-url section content
   */
  private sendSDKReadyToVideoUrlSection() {
    const sectionContainer = this.videoUrlSectionContainerRef?.nativeElement;
    if (!sectionContainer) {
      return;
    }

    // Send SDK ready message via postMessage (section content listens for this)
    window.postMessage({
      type: 'ai-sdk-ready',
      lessonId: this.lesson?.id,
      substageId: String(this.activeSubStageId),
      interactionId: this.interactionBuild?.id || this.interactionBuild?.interactionTypeId
    }, '*');

    // Also dispatch a custom event that the section content can listen to
    const event = new CustomEvent('ai-sdk-ready', {
      detail: {
        lessonId: this.lesson?.id,
        substageId: String(this.activeSubStageId),
        interactionId: this.interactionBuild?.id || this.interactionBuild?.interactionTypeId
      }
    });
    sectionContainer.dispatchEvent(event);
    
    console.log('[LessonView] ✅ SDK ready message sent to video URL section');
  }

  /**
   * Create SDK code for video-url section content
   */
  private createVideoUrlSectionSDK(): string {
    // Store player reference globally so SDK can access it
    const playerRef = this.videoUrlPlayerRef;
    (window as any).__videoUrlPlayerRef = playerRef;
    
    // Mark that we're in lesson view (not preview)
    (window as any).__isLessonView = true;
    
    // Build SDK code as a single string
    const sdkCode = `
      (function() {
        if (window.aiSDK) return; // Already exists
        
        const getPlayer = () => {
          // Get player from global reference set by lesson view
          return window.__videoUrlPlayerRef || null;
        };
        
        // Helper to send messages (works in same document via custom events)
        const sendMessage = (type, data, callback) => {
          const message = Object.assign({ type: type }, data);
          // Dispatch custom event for same-document communication
          const event = new CustomEvent('ai-sdk-message', { detail: message });
          document.dispatchEvent(event);
          // Also try postMessage for iframe compatibility
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, "*");
          }
          if (callback) {
            setTimeout(function() { callback({ success: true }); }, 0);
          }
        };
        
        window.aiSDK = {
          isReady: (callback) => {
            const listener = (event) => {
              if (event.data && event.data.type === "ai-sdk-ready") {
                window.removeEventListener("message", listener);
                if (callback) callback(true);
              }
            };
            window.addEventListener("message", listener);
            // Also check for custom event
            const customListener = (event) => {
              if (event.detail && event.detail.type === "ai-sdk-ready") {
                document.removeEventListener("ai-sdk-ready", customListener);
                if (callback) callback(true);
              }
            };
            document.addEventListener("ai-sdk-ready", customListener);
            setTimeout(() => {
              if (callback) callback(true);
            }, 100);
          },
          emitEvent: (event, processedContentId) => {
            sendMessage("ai-sdk-emit-event", { event, processedContentId });
          },
          updateState: (key, value) => {
            sendMessage("ai-sdk-update-state", { key, value });
          },
          getState: (key, callback) => {
            if (callback) callback(null);
          },
          playVideoUrl: (callback) => {
            const player = getPlayer();
            if (player) {
              player.playVideoUrl().then((success) => {
                if (callback) callback(success);
              });
            } else if (callback) {
              callback(false);
            }
          },
          pauseVideoUrl: (callback) => {
            const player = getPlayer();
            if (player) {
              player.pauseVideoUrl();
              if (callback) callback(true);
            } else if (callback) {
              callback(false);
            }
          },
          seekVideoUrl: (time, callback) => {
            const player = getPlayer();
            if (player) {
              player.seekVideoUrl(time);
              if (callback) callback(true);
            } else if (callback) {
              callback(false);
            }
          },
          setVideoUrlVolume: (volume, callback) => {
            const player = getPlayer();
            if (player) {
              player.setVideoUrlVolume(volume);
              if (callback) callback(true);
            } else if (callback) {
              callback(false);
            }
          },
          getVideoUrlCurrentTime: (callback) => {
            const player = getPlayer();
            if (player) {
              player.getVideoUrlCurrentTime().then((time) => {
                if (callback) callback(time);
              });
            } else if (callback) {
              callback(0);
            }
          },
          getVideoUrlDuration: (callback) => {
            const player = getPlayer();
            if (player) {
              player.getVideoUrlDuration().then((duration) => {
                if (callback) callback(duration);
              });
            } else if (callback) {
              callback(0);
            }
          },
          isVideoUrlPlaying: (callback) => {
            const player = getPlayer();
            if (player) {
              player.isVideoUrlPlaying().then((playing) => {
                if (callback) callback(playing);
              });
            } else if (callback) {
              callback(false);
            }
          },
          showVideoUrlOverlayHtml: (html) => {
            const player = getPlayer();
            if (player) {
              player.showOverlayHtml();
            }
          },
          hideVideoUrlOverlayHtml: () => {
            const player = getPlayer();
            if (player) {
              player.hideOverlayHtml();
            }
          },
          // Additional methods expected by SDK test interaction
          showOverlayHtml: () => {
            const player = getPlayer();
            if (player) {
              player.showOverlayHtml();
            }
          },
          hideOverlayHtml: () => {
            const player = getPlayer();
            if (player) {
              player.hideOverlayHtml();
            }
          },
          // UI Control Methods
          minimizeChatUI: () => {
            sendMessage("ai-sdk-minimize-chat-ui", {});
          },
          showChatUI: () => {
            sendMessage("ai-sdk-show-chat-ui", {});
          },
          activateFullscreen: () => {
            sendMessage("ai-sdk-activate-fullscreen", {});
          },
          deactivateFullscreen: () => {
            sendMessage("ai-sdk-deactivate-fullscreen", {});
          },
          postToChat: (content, role, showInWidget) => {
            sendMessage("ai-sdk-post-to-chat", { content, role, showInWidget });
          },
          showScript: (script, autoPlay) => {
            sendMessage("ai-sdk-show-script", { script, autoPlay });
          },
          showSnack: (content, duration, hideFromChatUI, callback) => {
            sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false }, (response) => {
              if (callback && response.snackId) {
                callback(response.snackId);
              }
            });
          },
          hideSnack: () => {
            sendMessage("ai-sdk-hide-snack", {});
          },
          // Data Storage Methods
          saveInstanceData: (data, callback) => {
            sendMessage("ai-sdk-save-instance-data", { data }, (response) => {
              if (callback) {
                callback(response.success, response.error);
              }
            });
          },
          getInstanceDataHistory: (filters, callback) => {
            const filtersData = filters ? {
              dateFrom: filters.dateFrom?.toISOString(),
              dateTo: filters.dateTo?.toISOString(),
              limit: filters.limit,
            } : {};
            sendMessage("ai-sdk-get-instance-data-history", { filters: filtersData }, (response) => {
              if (callback) {
                callback(response.data, response.error);
              }
            });
          },
          saveUserProgress: (data, callback) => {
            sendMessage("ai-sdk-save-user-progress", { data }, (response) => {
              if (callback) {
                callback(response.progress, response.error);
              }
            });
          },
          getUserProgress: (callback) => {
            sendMessage("ai-sdk-get-user-progress", {}, (response) => {
              if (callback) {
                callback(response.progress, response.error);
              }
            });
          },
          markCompleted: (callback) => {
            sendMessage("ai-sdk-mark-completed", {}, (response) => {
              if (callback) {
                callback(response.progress, response.error);
              }
            });
          },
          incrementAttempts: (callback) => {
            sendMessage("ai-sdk-increment-attempts", {}, (response) => {
              if (callback) {
                callback(response.progress, response.error);
              }
            });
          },
          getUserPublicProfile: (userId, callback) => {
            sendMessage("ai-sdk-get-user-public-profile", { userId }, (response) => {
              if (callback) {
                callback(response.profile, response.error);
              }
            });
          }
        };
        
        console.log('[VideoUrlSection] ✅ SDK created');
      })();
    `;
    
    return sdkCode;
  }

  private playTeacherScript(scriptArg?: any, scriptBlock?: any) {
    if (!scriptArg || !scriptArg.text) {
      console.log('[LessonView] No script to play');
      return;
    }

    const script = scriptArg;

    // Auto-clear previous script when new one starts
    if (this.currentTeacherScript && this.currentTeacherScript !== script) {
      console.log('[LessonView] Replacing previous script with new script');
    }

    console.log('[LessonView] Playing teacher script:', (script.text || '').substring(0, 50) + '...');
    this.currentTeacherScript = script;
    
    // Use scriptBlock parameter if provided, otherwise use script object itself
    const block = scriptBlock || script;
    const blockAny = block as any;
    
    // Check chat UI behavior - interaction config takes precedence, then script block settings
    const activeSubStageAny = this.activeSubStage as any;
    const interactionConfig = activeSubStageAny?.interaction?.config || {};
    const showAiTeacherUiOnLoad = interactionConfig.showAiTeacherUiOnLoad;
    const configOpenChatUI = interactionConfig.openChatUI;
    const configMinimizeChatUI = interactionConfig.minimizeChatUI;
    
    console.log('[LessonView] 🔍 Chat UI check:', {
      showAiTeacherUiOnLoad,
      configOpenChatUI,
      configMinimizeChatUI,
      blockOpenChatUI: blockAny.openChatUI,
      blockMinimizeChatUI: blockAny.minimizeChatUI,
      scriptOpenChatUI: (script as any).openChatUI,
      scriptMinimizeChatUI: (script as any).minimizeChatUI,
      blockKeys: Object.keys(block || {}),
      scriptKeys: Object.keys(script || {})
    });
    
    // Determine if chat UI should be shown
    let shouldShowChatUI = false;
    if (showAiTeacherUiOnLoad === true) {
      shouldShowChatUI = true;
      console.log('[LessonView] ✅ Chat UI: SHOW (interaction config: showAiTeacherUiOnLoad=true)');
    } else if (showAiTeacherUiOnLoad === false) {
      shouldShowChatUI = false;
      console.log('[LessonView] ✅ Chat UI: MINIMIZE (interaction config: showAiTeacherUiOnLoad=false)');
    } else if (configOpenChatUI === true) {
      shouldShowChatUI = true;
      console.log('[LessonView] ✅ Chat UI: SHOW (interaction config: openChatUI=true)');
    } else if (configMinimizeChatUI === true) {
      shouldShowChatUI = false;
      console.log('[LessonView] ✅ Chat UI: MINIMIZE (interaction config: minimizeChatUI=true)');
    } else {
      // Interaction config doesn't specify, check script block settings
      if (blockAny.openChatUI === true || (script as any).openChatUI === true) {
        shouldShowChatUI = true;
        console.log('[LessonView] ✅ Chat UI: SHOW (script block: openChatUI=true)');
      } else if (blockAny.minimizeChatUI === true || (script as any).minimizeChatUI === true) {
        shouldShowChatUI = false;
        console.log('[LessonView] ✅ Chat UI: MINIMIZE (script block: minimizeChatUI=true)');
      } else {
        // Default: show widget when script plays (for backward compatibility)
        shouldShowChatUI = true;
        console.log('[LessonView] ✅ Chat UI: SHOW (default behavior)');
      }
    }
    
    // Only show widget if it should be shown
    if (shouldShowChatUI) {
      this.teacherWidgetHidden = false; // Auto-show when script plays
      // Reset unread count when widget is auto-shown
      if (this.unreadMessageCount !== undefined) this.unreadMessageCount = 0;
      if (this.lastReadMessageCount !== undefined && this.chatMessages) {
        this.lastReadMessageCount = this.chatMessages.length;
      }
      if (this.teacherWidget) {
        this.teacherWidget.openWidget();
      }
    } else {
      // Keep widget hidden/minimized
      this.teacherWidgetHidden = true;
      if (this.teacherWidget) {
        this.teacherWidget.minimize();
      }
    }
    
    // Script blocks from DB may not have a 'type' field - default to 'teacher_talk' if it has text/content
    const blockType = blockAny.type || (script as any).type || (blockAny.text || blockAny.content ? 'teacher_talk' : undefined);
    const blockContent = blockAny.content || blockAny.text || (script as any).text || (script as any).content || '';
    
    console.log('[LessonView] 🔍 Script block debug:', {
      blockType,
      showInSnack: blockAny.showInSnack || (script as any).showInSnack,
      snackDuration: blockAny.snackDuration || (script as any).snackDuration,
      blockKeys: Object.keys(block || {}),
      scriptKeys: Object.keys(script || {}),
      block: JSON.stringify(block).substring(0, 200)
    });
    
    // Handle script block display configuration
    // Show in snack - only for teacher_talk blocks
    if (blockType === 'teacher_talk' || (!blockType && (blockAny.text || blockAny.content || (script as any).text))) {
      // Show in snack if configured
      const shouldShowInSnack = blockAny.showInSnack || (script as any).showInSnack;
      console.log('[LessonView] 🔍 Should show in snack?', shouldShowInSnack, 'block.showInSnack:', blockAny.showInSnack, 'script.showInSnack:', (script as any).showInSnack);
      
      if (shouldShowInSnack) {
        const duration = blockAny.snackDuration || (script as any).snackDuration;
        console.log('[LessonView] ✅ Showing snack message:', blockContent.substring(0, 50) + '...', 'duration:', duration);
        if (this.snackService) {
          this.snackService.show(blockContent, duration);
          console.log('[LessonView] ✅ Snack service.show() called');
        }
      } else {
        console.log('[LessonView] ⚠️ Not showing snack - showInSnack is false/undefined');
      }
    }
    
    // Chat UI controls - REMOVED: Already handled at the start of playTeacherScript
    
    // Activate fullscreen if configured - available for all script block types
    if (blockAny.activateFullscreen || (script as any)?.activateFullscreen) {
      if (this.isFullscreen !== undefined && !this.isFullscreen) {
        this.toggleFullscreen();
        console.log('[LessonView] ✅ Activating fullscreen');
      }
    }
  }
}
