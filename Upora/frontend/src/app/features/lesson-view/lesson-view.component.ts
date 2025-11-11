import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { LessonService } from '../../core/services/lesson.service';
import { WebSocketService, ChatMessage } from '../../core/services/websocket.service';
import { Subject } from 'rxjs';
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
    <div class="bg-brand-dark text-white overflow-hidden flex flex-col md:flex-row lesson-view-wrapper">
      <!-- Mobile overlay -->
      <div *ngIf="isMobileNavOpen" 
           (click)="closeMobileNav()"
           class="fixed inset-0 bg-black/60 z-30 md:hidden"></div>

      <!-- Mobile FAB for Stages -->
      <button 
        (click)="toggleMobileNav()"
        class="mobile-fab md:hidden"
        aria-label="Toggle stages menu">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
      </button>

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
          <h2 class="text-lg font-bold truncate">{{ lesson?.title }}</h2>
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
        <div class="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto pb-32 md:pb-8">
          <div *ngIf="activeSubStage; else selectPrompt">
            <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">{{ activeSubStage.title }}</h1>
            <p class="text-brand-gray mb-8">{{ activeSubStage.type }} • {{ activeSubStage.interactionType }} • {{ activeSubStage.duration }} minutes</p>

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
                [data]="interactionData"
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

            <!-- Fallback for no interaction data -->
            <div *ngIf="!isLoadingInteraction && !interactionData" class="bg-brand-black rounded-lg aspect-video flex items-center justify-center text-brand-gray">
              <div class="text-center">
                <p class="text-xl mb-4">Content for "{{ activeSubStage.title }}"</p>
                <p class="text-sm text-gray-500">Interaction Type: {{ activeSubStage.interactionType }}</p>
                <p class="text-xs text-gray-600 mt-2">No interaction data available yet</p>
                
                <!-- Toggle "Passed" button for Evaluate stages -->
                <button *ngIf="activeSubStage.type === 'Evaluate'"
                        (click)="togglePassStatus()"
                        class="mt-4 bg-brand-red text-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition">
                  {{ currentStage?.passed ? 'Mark as Not Passed' : 'Mark as Passed' }}
                </button>
              </div>
            </div>
          </div>

          <ng-template #selectPrompt>
            <div class="flex items-center justify-center h-full">
              <p class="text-brand-gray text-xl">Select a lesson stage to begin.</p>
            </div>
          </ng-template>
        </div>

        <!-- Bottom Control Bar (YouTube-style) -->
        <div class="lesson-control-bar">
          <button 
            class="control-bar-btn"
            (click)="toggleScriptPlay()"
            [title]="isScriptPlaying ? 'Pause' : 'Play'">
            <span *ngIf="!isScriptPlaying">▶️</span>
            <span *ngIf="isScriptPlaying">⏸️</span>
          </button>
          <button 
            class="control-bar-btn"
            (click)="skipScript()"
            title="Skip">
            ⏭️
          </button>
          <div class="script-progress-info">
            <span class="script-title">{{ currentTeacherScript?.text?.substring(0, 50) || 'Ready to teach' }}{{ currentTeacherScript?.text && currentTeacherScript.text.length > 50 ? '...' : '' }}</span>
          </div>
        </div>
      </main>

      <!-- Floating Teacher Widget -->
      <app-floating-teacher-widget
        [currentScript]="currentTeacherScript"
        [autoPlay]="true"
        [chatMessages]="chatMessages"
        [isAITyping]="isAITyping"
        [isConnected]="isConnected"
        (play)="onTeacherPlay()"
        (pause)="onTeacherPause()"
        (skipRequested)="onTeacherSkip()"
        (closed)="onTeacherClosed()"
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

    /* Lesson Control Bar (YouTube-style) */
    .lesson-control-bar {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(15, 15, 35, 0.95);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(0, 212, 255, 0.2);
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      z-index: 100;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
    }

    .control-bar-btn {
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: #ffffff;
      font-size: 1.25rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .control-bar-btn:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      transform: scale(1.05);
    }

    .script-progress-info {
      flex: 1;
      overflow: hidden;
    }

    .script-title {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }

    @media (max-width: 768px) {
      .lesson-control-bar {
        padding: 0.5rem 1rem;
      }

      .control-bar-btn {
        width: 40px;
        height: 40px;
      }

      .script-title {
        font-size: 0.75rem;
      }
    }
  `]
})
export class LessonViewComponent implements OnInit, OnDestroy {
  lesson: Lesson | null = null;
  lessonStages: Stage[] = [];
  activeStageId: number | null = null;
  activeSubStageId: number | null = null;
  currentStage: Stage | null = null;
  activeSubStage: SubStage | null = null;
  expandedStages = new Set<number>();
  
  // Sidebar state
  isMobileNavOpen = false;
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
  
  // Teacher Script
  currentTeacherScript: ScriptBlock | null = null;
  private teacherScriptTimeout: any = null;
  isScriptPlaying = false;
  
  // Interaction data
  interactionData: any = null;
  interactionScore: number | null = null;
  isLoadingInteraction = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private lessonService: LessonService,
    private router: Router,
    private route: ActivatedRoute,
    private wsService: WebSocketService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    console.log('[LessonView] ngOnInit called');
    console.log('[LessonView] enableWebSockets:', environment.enableWebSockets);
    
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
    });

    this.wsService.typing$.pipe(takeUntil(this.destroy$)).subscribe(typing => {
      this.isAITyping = typing;
    });

    // Setup mouse listeners for resize
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
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
    const rawStages = lesson.data?.stages || lesson.stages || [];
    
    // Normalize stage data: convert 'substages' to 'subStages' if needed
    this.lessonStages = rawStages.map((stage: any) => ({
      ...stage,
      subStages: stage.subStages || stage.substages || []
    }));
    
    console.log('[LessonView] Lesson set - ID:', lesson.id, 'Stages:', this.lessonStages.length);
    console.log('[LessonView] First stage:', JSON.stringify(this.lessonStages[0], null, 2).substring(0, 500));
    
    // Auto-select first stage and substage if available
    if (this.lessonStages.length > 0) {
      const firstStage = this.lessonStages[0];
      this.activeStageId = firstStage.id;
      this.expandedStages.add(firstStage.id);
      
      if (firstStage.subStages && firstStage.subStages.length > 0) {
        this.activeSubStageId = firstStage.subStages[0].id;
        this.updateActiveSubStage();
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

  selectSubStage(stageId: number, subStageId: number) {
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
   * Load interaction data for the active sub-stage
   */
  private loadInteractionData() {
    // Reset state
    this.interactionData = null;
    this.interactionScore = null;
    
    if (!this.activeSubStage?.contentOutputId) {
      console.log('[LessonView] No contentOutputId for this sub-stage');
      return;
    }

    const contentOutputId = this.activeSubStage.contentOutputId;
    console.log('[LessonView] Loading interaction data for contentOutputId:', contentOutputId);
    
    this.isLoadingInteraction = true;

    // Fetch processed content output
    this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${contentOutputId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (output: any) => {
          console.log('[LessonView] Loaded interaction data:', output);
          
          // Extract interaction data from the output
          if (output.outputData && output.outputData.interactionTypeId) {
            this.interactionData = {
              ...output.outputData,
              interactionTypeId: output.outputData.interactionTypeId
            };
            console.log('[LessonView] Interaction ready:', this.interactionData.interactionTypeId);
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
    
    // TODO: Save score to backend (student_topic_scores table)
    // For now, just log it
    console.log('[LessonView] Score:', result.score, '% - Selected:', result.selectedFragments);
    
    // TODO: Play "after" script when interaction completes
    // this.playTeacherScript(this.activeSubStage?.script?.after);
  }

  /**
   * Teacher Widget Handlers
   */
  onTeacherPlay() {
    console.log('[LessonView] Teacher playing script');
    this.isScriptPlaying = true;
    // TODO: Integrate TTS here when ready
    // For now, auto-clear after estimated duration
    if (this.currentTeacherScript?.estimatedDuration) {
      this.teacherScriptTimeout = setTimeout(() => {
        this.currentTeacherScript = null;
        this.isScriptPlaying = false;
      }, this.currentTeacherScript.estimatedDuration * 1000);
    }
  }

  onTeacherPause() {
    console.log('[LessonView] Teacher paused');
    this.isScriptPlaying = false;
    if (this.teacherScriptTimeout) {
      clearTimeout(this.teacherScriptTimeout);
      this.teacherScriptTimeout = null;
    }
  }

  onTeacherSkip() {
    console.log('[LessonView] Teacher script skipped');
    this.isScriptPlaying = false;
    if (this.teacherScriptTimeout) {
      clearTimeout(this.teacherScriptTimeout);
      this.teacherScriptTimeout = null;
    }
    this.currentTeacherScript = null;
  }

  onTeacherClosed() {
    console.log('[LessonView] Teacher widget closed');
    this.isScriptPlaying = false;
    this.currentTeacherScript = null;
  }

  /**
   * Bottom Control Bar Methods
   */
  toggleScriptPlay() {
    if (this.isScriptPlaying) {
      this.onTeacherPause();
    } else {
      this.onTeacherPlay();
    }
  }

  skipScript() {
    this.onTeacherSkip();
  }

  /**
   * Chat Methods (delegated to widget)
   */
  sendChatMessage(message: string) {
    console.log('[LessonView] Sending chat message:', message);
    if (!this.isConnected) {
      console.warn('[LessonView] Cannot send - not connected to WebSocket');
      return;
    }
    this.wsService.sendMessage(message);
  }

  raiseHand() {
    console.log('[LessonView] Raise hand clicked');
    this.wsService.sendMessage('🖐️ Student raised hand');
  }

  /**
   * Play a teacher script block
   */
  private playTeacherScript(script?: ScriptBlock | any) {
    if (!script || !script.text) {
      console.log('[LessonView] No script to play');
      return;
    }

    console.log('[LessonView] Playing teacher script:', script.text.substring(0, 50) + '...');
    this.currentTeacherScript = script;
  }
}
