import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
// html2canvas will be dynamically imported
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { LessonService } from '../../core/services/lesson.service';
import { WebSocketService, ChatMessage } from '../../core/services/websocket.service';
import { ScreenshotStorageService } from '../../core/services/screenshot-storage.service';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Lesson, Stage, SubStage } from '../../core/models/lesson.model';
import { environment } from '../../../environments/environment';
import { TrueFalseSelectionComponent } from '../interactions/true-false-selection/true-false-selection.component';
import { FloatingTeacherWidgetComponent, ScriptBlock } from '../../shared/components/floating-teacher/floating-teacher-widget.component';

@Component({
  selector: 'app-lesson-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, TrueFalseSelectionComponent, FloatingTeacherWidgetComponent],
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

            <!-- True/False Selection Interaction -->
            <div *ngIf="!isLoadingInteraction && interactionData?.interactionTypeId === 'true-false-selection'">
              <app-true-false-selection
                [data]="normalizedInteractionData"
                [lessonId]="lesson?.id || null"
                [stageId]="activeStageId?.toString() || null"
                [substageId]="activeSubStageId?.toString() || null"
                (completed)="onInteractionCompleted($event)">
              </app-true-false-selection>
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

            <!-- Embedded Interaction (from JSON) -->
            <div *ngIf="!isLoadingInteraction && !interactionData && getEmbeddedInteraction()">
              <!-- Error message if config is empty -->
              <div *ngIf="getEmbeddedInteraction()?.type === 'true-false-selection' && !hasValidInteractionConfig(getEmbeddedInteraction()?.config)" 
                   class="bg-red-900/20 border-2 border-red-500 rounded-lg p-8 text-center">
                <div class="text-red-400 text-2xl mb-4">⚠️</div>
                <h3 class="text-red-400 text-xl font-bold mb-2">Interaction Not Configured</h3>
                <p class="text-red-300">This interaction has not been configured correctly by the lesson-builder.</p>
                <p class="text-red-200 text-sm mt-2">Please contact the lesson creator to fix this issue.</p>
              </div>
              
              <!-- Show interaction if config is valid -->
              <app-true-false-selection
                *ngIf="getEmbeddedInteraction()?.type === 'true-false-selection' && hasValidInteractionConfig(getEmbeddedInteraction()?.config)"
                [data]="normalizedEmbeddedInteractionData"
                [lessonId]="lesson?.id || null"
                [stageId]="activeStageId?.toString() || null"
                [substageId]="activeSubStageId?.toString() || null"
                (completed)="onInteractionCompleted($event)">
              </app-true-false-selection>
            </div>

            <!-- Fallback for no interaction data -->
            <div *ngIf="!isLoadingInteraction && !interactionData && !getEmbeddedInteraction()" class="bg-brand-black rounded-lg aspect-video flex items-center justify-center text-brand-gray">
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
              <span *ngIf="!showTimer" class="script-title">{{ currentTeacherScript?.text?.substring(0, 40) || 'Ready to teach' }}{{ (currentTeacherScript?.text?.length || 0) > 40 ? '...' : '' }}</span>
              <span *ngIf="showTimer" class="timer-display">⏱️ {{ formatTime(elapsedSeconds) }}</span>
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
        <span *ngIf="chatMessages.length > 0" class="fab-badge">{{ chatMessages.length }}</span>
      </div>

      <!-- Floating Teacher Widget -->
      <app-floating-teacher-widget
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
        (raiseHandClicked)="raiseHand()">
      </app-floating-teacher-widget>
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
  
  // Teacher Script
  currentTeacherScript: ScriptBlock | null = null;
  private teacherScriptTimeout: any = null;
  isScriptPlaying = false;
  teacherWidgetHidden = true; // Start hidden, show on first script or manual open
  private autoAdvanceTimeout: any = null;
  
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
  
  private destroy$ = new Subject<void>();
  private processedOutputsCache = new Map<string, any[]>();

  constructor(
    private lessonService: LessonService,
    public router: Router,
    private route: ActivatedRoute,
    private wsService: WebSocketService,
    private http: HttpClient,
    private screenshotStorage: ScreenshotStorageService
  ) {}

  ngOnInit() {
    console.log('[LessonView] ngOnInit called');
    console.log('[LessonView] enableWebSockets:', environment.enableWebSockets);
    
    // Start timer immediately when lesson loads (always running in background)
    console.log('[LessonView] 🚀 Starting timer on lesson load');
    this.startTimer();
    
    // Auto-play lesson
    this.isScriptPlaying = true;
    console.log('[LessonView] 🎬 Auto-playing lesson');
    
    // Get lesson ID from route params
    this.route.params.subscribe(params => {
      const lessonId = params['id'];
      console.log('[LessonView] Route lesson ID:', lessonId);
      
      if (lessonId && !this.lesson) {
        // Load lesson data from API if not already loaded
        this.loadLessonData(lessonId);
      }
    });
    
    this.lessonService.activeLesson$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lesson => {
        console.log('[LessonView] activeLesson$ emitted:', lesson?.title || 'null');
        
        if (lesson) {
          this.setLessonData(lesson);
        }
      });

    // Subscribe to WebSocket events
    this.wsService.connected$.pipe(takeUntil(this.destroy$)).subscribe(connected => {
      this.isConnected = connected;
      console.log('[LessonView] WebSocket connected:', connected);
    });

    this.wsService.messages$.pipe(takeUntil(this.destroy$)).subscribe(messages => {
      this.chatMessages = messages;
      console.log('[LessonView] Chat messages updated:', messages.length);
      
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
  }

  /**
   * Attempt to resolve a processed content output for the currently active sub-stage
   */
  private async ensureContentOutputForActiveSubstage(): Promise<string | null> {
    if (!this.lesson?.id || !this.activeSubStage) {
      return null;
    }

    const subStage = this.activeSubStage;
    if (subStage.contentOutputId !== undefined && subStage.contentOutputId !== null) {
      return this.normalizeContentOutputId(subStage.contentOutputId);
    }

    const outputs = await this.fetchProcessedOutputsForLesson(this.lesson.id);
    if (!outputs.length) {
      return null;
    }

    const interactionType = subStage.interaction?.type || subStage.interactionType;
    const subStageTitle = (subStage.title || '').toLowerCase();
    const stageTitle = (this.currentStage?.title || '').toLowerCase();

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

    if (!match && outputs.length === 1) {
      match = outputs[0];
    }

    if (match) {
      subStage.contentOutputId = match.id;
      if (subStage.interaction) {
        subStage.interaction.contentOutputId = match.id;
      }
      return match.id;
    }

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

  private normalizeContentOutputId(value?: string | number | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return typeof value === 'string' ? value : String(value);
  }

  /**
   * Load lesson data from API
   */
  private loadLessonData(lessonId: string) {
    console.log('[LessonView] Loading lesson data for ID:', lessonId);
    
    // Fetch lesson from API
    fetch(`http://localhost:3000/api/lessons/${lessonId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(lesson => {
        console.log('[LessonView] Loaded lesson from API:', lesson.title);
        this.setLessonData(lesson);
      })
      .catch(error => {
        console.error('[LessonView] Error loading lesson:', error);
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
    
    // Auto-select first stage and substage if available
    if (this.lessonStages.length > 0) {
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
          this.playTeacherScript(scriptBlocks[0]);
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
  }

  toggleStage(stageId: number) {
    if (this.expandedStages.has(stageId)) {
      this.expandedStages.delete(stageId);
    } else {
      this.expandedStages.add(stageId);
    }
  }

  selectSubStage(stageId: string | number, subStageId: string | number) {
    this.activeStageId = stageId;
    this.activeSubStageId = subStageId;
    this.isMobileNavOpen = false;
    
    // Mark stage as viewed
    this.lessonStages = this.lessonStages.map(stage =>
      stage.id === stageId ? { ...stage, viewed: true } : stage
    );
    
    this.updateActiveSubStage();
    
    // Load interaction data if available
    this.loadInteractionData();
    
    // Play teacher script if available (or demo script for testing)
    // TODO: Get script from activeSubStage.script.before
    if (this.activeSubStage) {
      // Demo script for testing the widget
      this.playTeacherScript({
        text: `Welcome to ${this.activeSubStage.title || 'this sub-stage'}! Let me explain what we'll be learning here. This is a demonstration of the AI teacher script system. In production, these scripts will be defined in the lesson data and can be edited by lesson builders.`,
        estimatedDuration: 15
      });
    }
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
    
    // Clear any existing auto-advance timeout
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
    
    // If no interaction, auto-advance after script duration
    if (!this.getEmbeddedInteraction() && this.activeSubStage) {
      const scriptDuration = this.calculateSubStageScriptDuration();
      
      this.autoAdvanceTimeout = setTimeout(() => {
        this.moveToNextSubStage();
      }, scriptDuration * 1000);
    }
  }
  
  /**
   * Calculate total script duration for current substage
   */
  private calculateSubStageScriptDuration(): number {
    if (!this.activeSubStage) return 5; // Default 5 seconds
    
    const scriptBlocks = (this.activeSubStage as any)?.scriptBlocks || [];
    const afterScripts = (this.activeSubStage as any)?.scriptBlocksAfterInteraction || [];
    
    const totalDuration = [...scriptBlocks, ...afterScripts].reduce(
      (sum, script) => sum + (script.estimatedDuration || 10),
      0
    );
    
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
    
    if (environment.logLevel === 'debug') {
      console.log('[LessonView] Normalized interaction data:', {
        fragmentsCount: normalized.fragments.length,
        targetStatement: normalized.targetStatement,
        maxFragments: normalized.maxFragments,
        showHints: normalized.showHints
      });
    }
    
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

    const fetchFromOutput = (contentOutputId: string) => {
      console.log('[LessonView] Loading interaction data for contentOutputId:', contentOutputId);
      
      this.isLoadingInteraction = true;

      this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${contentOutputId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (output: any) => {
            console.log('[LessonView] Loaded interaction data (raw):', output);
            
            if (output.outputData && output.outputData.interactionTypeId) {
              const rawData = {
                ...output.outputData,
                interactionTypeId: output.outputData.interactionTypeId
              };
              this.interactionData = rawData;
              this.normalizedInteractionData = this.normalizeInteractionData(rawData);
            } else if (output.outputData && output.outputType === 'true-false-selection') {
              const fragments = (output.outputData.statements || []).map((stmt: any) => ({
                text: stmt.text,
                isTrueInContext: stmt.isTrue,
                explanation: stmt.explanation || ''
              }));
              const rawData = {
                fragments,
                targetStatement: output.outputName || 'True or False?',
                interactionTypeId: 'true-false-selection'
              };
              this.interactionData = rawData;
              this.normalizedInteractionData = this.normalizeInteractionData(rawData);
            } else {
              console.warn('[LessonView] No interaction data in output');
            }
            
            this.isLoadingInteraction = false;
          },
          error: (error) => {
            console.error('[LessonView] Error loading interaction data:', error);
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
      this.playTeacherScript(afterScripts[0]);
    }
    
    // Auto-advance to next substage/stage
    this.moveToNextSubStage();
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
    this.activeStageId = null;
    this.activeSubStageId = null;
    this.activeSubStage = null;
    this.currentTeacherScript = null;
    this.isScriptPlaying = false;
    console.log('[LessonView] Showing end of lesson screen');
  }
  
  /**
   * Restart the lesson from the beginning
   */
  restartLesson() {
    console.log('[LessonView] Restarting lesson');
    this.elapsedSeconds = 0; // Reset timer
    
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
   * Teacher Widget Handlers
   */
  onTeacherPlay() {
    console.log('[LessonView] ▶️ PLAY - Setting isScriptPlaying = true');
    console.log('[LessonView] Timer interval active:', !!this.timerInterval);
    console.log('[LessonView] Current elapsed:', this.elapsedSeconds);
    this.isScriptPlaying = true;
    // Timer will now increment (if visible)
    // TODO: Integrate TTS here when ready
    // Script stays visible until user closes or new script starts
  }

  onTeacherPause() {
    console.log('[LessonView] ⏸ PAUSE - Setting isScriptPlaying = false');
    this.isScriptPlaying = false;
    // Timer will now pause (stops incrementing)
  }

  onTeacherSkip() {
    console.log('[LessonView] Teacher script skipped');
    this.isScriptPlaying = false;
    this.currentTeacherScript = null;
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
  }

  /**
   * Bottom Control Bar Methods
   */
  toggleScriptPlay() {
    console.log('[LessonView] Toggle play/pause from control bar');
    if (this.isScriptPlaying) {
      this.onTeacherPause();
    } else {
      this.onTeacherPlay();
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
    const currentStageInfo = {
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
   * Toggle teacher widget visibility
   */
  toggleTeacherWidget() {
    this.teacherWidgetHidden = !this.teacherWidgetHidden;
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
  }

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
   * Play a teacher script block
   */
  private playTeacherScript(script?: ScriptBlock | any) {
    if (!script || !script.text) {
      console.log('[LessonView] No script to play');
      return;
    }

    // Auto-clear previous script when new one starts
    if (this.currentTeacherScript && this.currentTeacherScript !== script) {
      console.log('[LessonView] Replacing previous script with new script');
    }

    console.log('[LessonView] Playing teacher script:', script.text.substring(0, 50) + '...');
    this.currentTeacherScript = script;
    this.teacherWidgetHidden = false; // Auto-show when script plays
  }
}
